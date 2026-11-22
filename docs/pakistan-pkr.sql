-- Pakistan localisation for Nowhere: prices in Pakistani Rupees (PKR), Pakistani delivery details.
-- Run AFTER docs/shopify-parity.sql. Safe to run twice. Money columns keep their names (*_cents) but now
-- hold PAISA (1 rupee = 100 paisa), so Rs 6,499 is stored as 649900.

-- ───────── Currency: orders were locked to USD
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.orders'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ~ 'currency'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'PKR';
ALTER TABLE public.orders ADD CONSTRAINT orders_currency_check CHECK (currency IN ('PKR', 'USD'));

-- ───────── Delivery details used for cash-on-delivery calls and couriers
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_phone text,
  ADD COLUMN IF NOT EXISTS shipping_province text;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_phone_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_phone_check
  CHECK (shipping_phone IS NULL OR shipping_phone ~ '^\+923[0-9]{9}$');
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_province_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_province_check
  CHECK (shipping_province IS NULL OR shipping_province IN ('Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan',
    'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Jammu & Kashmir'));

-- ───────── Store settings: Rs 250 delivery, free from Rs 7,500, prices include any tax, COD on
ALTER TABLE public.store_settings ALTER COLUMN shipping_flat_cents SET DEFAULT 25000;
ALTER TABLE public.store_settings ALTER COLUMN free_shipping_threshold_cents SET DEFAULT 750000;
UPDATE public.store_settings SET shipping_flat_cents = 25000, free_shipping_threshold_cents = 750000,
  tax_rate_bps = 0, cod_enabled = true WHERE id;

-- ───────── Product prices in rupees (paisa)
UPDATE public.products AS p SET price_cents = v.price
FROM (VALUES
  ('studio-hoodie', 649900), ('after-hours-hoodie', 699900),
  ('evergreen-track-set', 899900), ('midnight-track-set', 949900),
  ('signal-shell-jacket', 849900), ('city-bomber', 899900),
  ('utility-wide-trouser', 499900), ('form-pleated-trouser', 549900),
  ('essential-poplin-shirt', 399900), ('blue-hour-shirt', 429900)
) AS v(slug, price) WHERE p.slug = v.slug;

-- ───────── Order creation with phone + province (country is always Pakistan for now)
DROP FUNCTION IF EXISTS public.create_order_from_checkout(uuid, text, text, text, text, text, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION public.create_order_from_checkout(
  p_user uuid, p_name text, p_email text, p_phone text, p_address text, p_city text, p_province text, p_postal text,
  p_items jsonb, p_code text, p_method text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.store_settings; d public.discount_codes; item jsonb; prod public.products;
  v_qty integer; v_size text; v_color text; v_sub bigint := 0; v_disc integer := 0; v_ship integer; v_tax integer;
  v_total integer; v_order public.orders; v_lines jsonb := '[]'::jsonb; n integer; n_distinct integer;
  v_digits text; v_phone text; v_postal text;
BEGIN
  IF p_method NOT IN ('cod', 'card') THEN RAISE EXCEPTION 'Choose a payment method'; END IF;
  SELECT * INTO s FROM public.store_settings WHERE id;
  IF p_method = 'cod' AND NOT s.cod_enabled THEN RAISE EXCEPTION 'Cash on delivery is not available'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Select between 1 and 20 different apparel items';
  END IF;
  SELECT count(*), count(DISTINCT value->>'product_id') INTO n, n_distinct FROM jsonb_array_elements(p_items);
  IF n <> n_distinct THEN RAISE EXCEPTION 'Each apparel item can appear only once per order'; END IF;

  -- Mobile numbers: 03XX XXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX or 00923XXXXXXXXX; stored as +923XXXXXXXXX.
  v_digits := regexp_replace(coalesce(p_phone, ''), '[\s\-()]', '', 'g');
  IF v_digits !~ '^(\+92|0092|92|0)?3[0-9]{9}$' THEN RAISE EXCEPTION 'Enter a valid Pakistani mobile number, like 0300 1234567'; END IF;
  v_phone := '+92' || right(v_digits, 10);
  IF p_province IS NULL OR p_province NOT IN ('Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Jammu & Kashmir') THEN
    RAISE EXCEPTION 'Choose your province';
  END IF;
  v_postal := CASE WHEN p_postal IS NULL OR trim(p_postal) = '' THEN 'N/A' ELSE trim(p_postal) END;
  IF p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 2 AND 120
     OR p_email IS NULL OR char_length(trim(p_email)) NOT BETWEEN 3 AND 320 OR position('@' IN p_email) < 2
     OR p_address IS NULL OR char_length(trim(p_address)) NOT BETWEEN 5 AND 240
     OR p_city IS NULL OR char_length(trim(p_city)) NOT BETWEEN 2 AND 100
     OR char_length(v_postal) NOT BETWEEN 2 AND 24 THEN
    RAISE EXCEPTION 'Complete all required delivery details';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'product_id' LOOP
    v_qty := (item->>'quantity')::integer; v_size := item->>'size'; v_color := item->>'color';
    IF v_qty NOT BETWEEN 1 AND 5 OR v_size NOT IN ('S','M','L','XL','XXL') OR v_color NOT IN ('ink','cherry','fern','cloud','navy') THEN
      RAISE EXCEPTION 'Choose an available size, color, and quantity for every item';
    END IF;
    SELECT * INTO prod FROM public.products WHERE id = (item->>'product_id')::uuid AND status = 'published' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'An apparel item is no longer available'; END IF;
    IF NOT v_color = ANY(prod.color_options) THEN RAISE EXCEPTION 'That color is no longer available'; END IF;
    IF prod.stock_quantity < v_qty THEN RAISE EXCEPTION 'Insufficient stock for %', prod.name; END IF;
    v_sub := v_sub + prod.price_cents::bigint * v_qty;
    v_lines := v_lines || jsonb_build_object('product_id', prod.id, 'name', prod.name, 'slug', prod.slug, 'image_key', prod.image_key,
      'size', v_size, 'color', v_color, 'quantity', v_qty, 'unit_price_cents', prod.price_cents);
  END LOOP;
  IF v_sub < 1 OR v_sub > 2147483647 THEN RAISE EXCEPTION 'Order exceeds the accepted amount'; END IF;

  IF p_code IS NOT NULL AND trim(p_code) <> '' THEN
    SELECT * INTO d FROM public.discount_codes WHERE code = upper(trim(p_code)) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'This discount code is not valid'; END IF;
    v_disc := public.calc_discount(d, v_sub::integer);
    UPDATE public.discount_codes SET used_count = used_count + 1 WHERE id = d.id;
  END IF;

  v_ship := CASE WHEN s.free_shipping_threshold_cents IS NOT NULL AND (v_sub - v_disc) >= s.free_shipping_threshold_cents THEN 0 ELSE s.shipping_flat_cents END;
  v_tax := round((v_sub - v_disc) * s.tax_rate_bps / 10000.0)::integer;
  v_total := v_sub::integer - v_disc + v_ship + v_tax;

  INSERT INTO public.orders (user_id, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_province,
    shipping_postal_code, shipping_country, currency, subtotal_cents, discount_cents, discount_code, shipping_cents, tax_cents, total_cents, payment_method)
  VALUES (p_user, trim(p_name), lower(trim(p_email)), v_phone, trim(p_address), trim(p_city), p_province,
    v_postal, 'Pakistan', 'PKR', v_sub::integer, v_disc, CASE WHEN d.id IS NULL THEN NULL ELSE d.code END, v_ship, v_tax, v_total, p_method)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (order_id, product_id, product_name, product_slug, image_key, size, color, quantity, unit_price_cents)
  SELECT v_order.id, (l->>'product_id')::uuid, l->>'name', l->>'slug', l->>'image_key', l->>'size', l->>'color',
         (l->>'quantity')::integer, (l->>'unit_price_cents')::integer
  FROM jsonb_array_elements(v_lines) AS l;

  RETURN jsonb_build_object('id', v_order.id, 'guest_token', v_order.guest_token, 'subtotal_cents', v_order.subtotal_cents,
    'discount_cents', v_disc, 'shipping_cents', v_ship, 'tax_cents', v_tax, 'total_cents', v_total, 'items', v_lines);
END; $$;
REVOKE ALL ON FUNCTION public.create_order_from_checkout(uuid, text, text, text, text, text, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_checkout(uuid, text, text, text, text, text, text, text, jsonb, text, text) TO service_role;
