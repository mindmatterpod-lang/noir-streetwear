-- Shopify-parity migration for Nowhere.
-- Apply AFTER the existing migrations, via Lovable ("apply this SQL") or the Supabase SQL editor,
-- BEFORE deploying the `shopify-parity` branch. It is written to be re-runnable where practical.

-- ───────────────────────── Store settings (shipping, tax, payment options)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  shipping_flat_cents integer NOT NULL DEFAULT 800 CHECK (shipping_flat_cents BETWEEN 0 AND 1000000),
  free_shipping_threshold_cents integer DEFAULT 15000 CHECK (free_shipping_threshold_cents IS NULL OR free_shipping_threshold_cents >= 0),
  tax_rate_bps integer NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 5000),
  cod_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.store_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings are public" ON public.store_settings;
CREATE POLICY "Settings are public" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins update settings" ON public.store_settings;
CREATE POLICY "Admins update settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP TRIGGER IF EXISTS store_settings_updated_at ON public.store_settings;
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────────────────── Discount codes (admin-managed; customers only validate via RPC)
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,32}$'),
  percent_off integer CHECK (percent_off BETWEEN 1 AND 100),
  amount_off_cents integer CHECK (amount_off_cents > 0),
  min_subtotal_cents integer NOT NULL DEFAULT 0 CHECK (min_subtotal_cents >= 0),
  max_uses integer CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_exactly_one_kind CHECK ((percent_off IS NOT NULL) <> (amount_off_cents IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage discount codes" ON public.discount_codes;
CREATE POLICY "Admins manage discount codes" ON public.discount_codes FOR ALL TO authenticated
  USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- Pure calculation shared by the preview RPC and order creation. Raises a customer-readable error.
CREATE OR REPLACE FUNCTION public.calc_discount(d public.discount_codes, p_subtotal integer)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT d.active OR (d.expires_at IS NOT NULL AND d.expires_at < now())
     OR (d.max_uses IS NOT NULL AND d.used_count >= d.max_uses) THEN
    RAISE EXCEPTION 'This discount code is not valid';
  END IF;
  IF p_subtotal < d.min_subtotal_cents THEN
    RAISE EXCEPTION 'This code needs a minimum order of % cents', d.min_subtotal_cents;
  END IF;
  IF d.percent_off IS NOT NULL THEN RETURN (p_subtotal::bigint * d.percent_off / 100)::integer; END IF;
  RETURN LEAST(d.amount_off_cents, p_subtotal);
END; $$;
REVOKE ALL ON FUNCTION public.calc_discount(public.discount_codes, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calc_discount(public.discount_codes, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.preview_discount(p_code text, p_subtotal integer)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.discount_codes;
BEGIN
  SELECT * INTO d FROM public.discount_codes WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'This discount code is not valid'; END IF;
  -- calc_discount is service_role-only, so evaluate it through this definer function's privileges.
  RETURN public.calc_discount(d, p_subtotal);
END; $$;
REVOKE ALL ON FUNCTION public.preview_discount(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_discount(text, integer) TO anon, authenticated, service_role;

-- ───────────────────────── Orders: guest checkout, discount, shipping, tax, payment
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  ADD COLUMN IF NOT EXISTS tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'card')),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
-- Replace the old "free shipping, total = subtotal + shipping" checks. They are found by definition,
-- not by name, because Postgres auto-names multi-column column checks (e.g. "orders_check").
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.orders'::regclass AND contype = 'c'
             AND (pg_get_constraintdef(oid) ~ 'shipping_cents' OR pg_get_constraintdef(oid) ~ 'total_cents')
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.orders ADD CONSTRAINT orders_total_matches
  CHECK (total_cents = subtotal_cents - discount_cents + shipping_cents + tax_cents AND discount_cents <= subtotal_cents);

-- Orders are now created only by the server (service role) through create_order_from_checkout.
-- (Also fixes admins being unable to update orders: UPDATE had been revoked from `authenticated`.)
DROP POLICY IF EXISTS "Customers may create their own pending orders" ON public.orders;
DROP TRIGGER IF EXISTS orders_prepare_checkout ON public.orders;
DROP TRIGGER IF EXISTS orders_create_order_items ON public.orders;
DROP FUNCTION IF EXISTS public.prepare_checkout_order();
DROP FUNCTION IF EXISTS public.create_checkout_order_items();
REVOKE INSERT ON public.orders FROM authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
-- The earlier migration left only "customers read their own orders": admins could not see any order.
DROP POLICY IF EXISTS "Admins read all orders" ON public.orders;
CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role('admin'));

CREATE OR REPLACE FUNCTION public.create_order_from_checkout(
  p_user uuid, p_name text, p_email text, p_address text, p_city text, p_postal text, p_country text,
  p_items jsonb, p_code text, p_method text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.store_settings; d public.discount_codes; item jsonb; prod public.products;
  v_qty integer; v_size text; v_color text; v_sub bigint := 0; v_disc integer := 0; v_ship integer; v_tax integer;
  v_total integer; v_order public.orders; v_lines jsonb := '[]'::jsonb; n integer; n_distinct integer;
BEGIN
  IF p_method NOT IN ('cod', 'card') THEN RAISE EXCEPTION 'Choose a payment method'; END IF;
  SELECT * INTO s FROM public.store_settings WHERE id;
  IF p_method = 'cod' AND NOT s.cod_enabled THEN RAISE EXCEPTION 'Cash on delivery is not available'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Select between 1 and 20 different apparel items';
  END IF;
  SELECT count(*), count(DISTINCT value->>'product_id') INTO n, n_distinct FROM jsonb_array_elements(p_items);
  IF n <> n_distinct THEN RAISE EXCEPTION 'Each apparel item can appear only once per order'; END IF;
  IF p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 2 AND 120
     OR p_email IS NULL OR char_length(trim(p_email)) NOT BETWEEN 3 AND 320 OR position('@' IN p_email) < 2
     OR p_address IS NULL OR char_length(trim(p_address)) NOT BETWEEN 5 AND 240
     OR p_city IS NULL OR char_length(trim(p_city)) NOT BETWEEN 2 AND 100
     OR p_postal IS NULL OR char_length(trim(p_postal)) NOT BETWEEN 2 AND 24
     OR p_country IS NULL OR char_length(trim(p_country)) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Complete all required shipping details';
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

  INSERT INTO public.orders (user_id, shipping_name, shipping_email, shipping_address, shipping_city, shipping_postal_code, shipping_country,
    subtotal_cents, discount_cents, discount_code, shipping_cents, tax_cents, total_cents, payment_method)
  VALUES (p_user, trim(p_name), lower(trim(p_email)), trim(p_address), trim(p_city), trim(p_postal), trim(p_country),
    v_sub::integer, v_disc, CASE WHEN d.id IS NULL THEN NULL ELSE d.code END, v_ship, v_tax, v_total, p_method)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (order_id, product_id, product_name, product_slug, image_key, size, color, quantity, unit_price_cents)
  SELECT v_order.id, (l->>'product_id')::uuid, l->>'name', l->>'slug', l->>'image_key', l->>'size', l->>'color',
         (l->>'quantity')::integer, (l->>'unit_price_cents')::integer
  FROM jsonb_array_elements(v_lines) AS l;

  RETURN jsonb_build_object('id', v_order.id, 'guest_token', v_order.guest_token, 'subtotal_cents', v_order.subtotal_cents,
    'discount_cents', v_disc, 'shipping_cents', v_ship, 'tax_cents', v_tax, 'total_cents', v_total, 'items', v_lines);
END; $$;
REVOKE ALL ON FUNCTION public.create_order_from_checkout(uuid, text, text, text, text, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_checkout(uuid, text, text, text, text, text, text, jsonb, text, text) TO service_role;

-- Guests (and signed-in customers) open an order from the link in their email: order id + secret token.
CREATE OR REPLACE FUNCTION public.get_order_public(p_order uuid, p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('id', o.id, 'status', o.status, 'payment_status', o.payment_status, 'payment_method', o.payment_method,
    'tracking_number', o.tracking_number, 'created_at', o.created_at, 'subtotal_cents', o.subtotal_cents, 'discount_cents', o.discount_cents,
    'shipping_cents', o.shipping_cents, 'tax_cents', o.tax_cents, 'total_cents', o.total_cents, 'shipping_name', o.shipping_name,
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', i.product_name, 'size', i.size, 'color', i.color,
      'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents)) FROM public.order_items i WHERE i.order_id = o.id), '[]'::jsonb))
  FROM public.orders o WHERE o.id = p_order AND o.guest_token = p_token;
$$;
REVOKE ALL ON FUNCTION public.get_order_public(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid, uuid) TO anon, authenticated, service_role;

-- ───────────────────────── Product images (several per product, uploaded by admins)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[];
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role('admin'));
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role('admin'));
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role('admin'));

-- ───────────────────────── Verified-buyer reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 1 AND 60),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text CHECK (title IS NULL OR char_length(title) <= 120),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 5 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Buyers review products they bought" ON public.reviews;
CREATE POLICY "Buyers review products they bought" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.order_items i JOIN public.orders o ON o.id = i.order_id
    WHERE i.product_id = reviews.product_id AND o.user_id = (SELECT auth.uid()) AND o.status <> 'cancelled'));
DROP POLICY IF EXISTS "Authors edit their review" ON public.reviews;
CREATE POLICY "Authors edit their review" ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Authors or admins delete reviews" ON public.reviews;
CREATE POLICY "Authors or admins delete reviews" ON public.reviews FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role('admin'));
