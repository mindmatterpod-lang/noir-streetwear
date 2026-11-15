ALTER TABLE public.orders ADD COLUMN checkout_items jsonb;
DROP POLICY IF EXISTS "Customers may read their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers and admins may read their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers may create their own pending orders" ON public.orders;
DROP POLICY IF EXISTS "Admins may update orders" ON public.orders;
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
CREATE POLICY "Customers may read their own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Customers may create their own pending orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (SELECT auth.uid()) AND status = 'pending' AND stock_reserved = false
    AND tracking_number IS NULL AND currency = 'USD' AND shipping_cents = 0
  );
CREATE POLICY "Admins may update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.create_order_with_items(jsonb, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_inventory_on_processing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE item record; updated_product uuid;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT ((OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled'))
      OR (OLD.status = 'processing' AND NEW.status IN ('shipped', 'cancelled'))
      OR (OLD.status = 'shipped' AND NEW.status = 'delivered')) THEN
    RAISE EXCEPTION 'Invalid order status transition';
  END IF;
  IF OLD.status = 'pending' AND NEW.status = 'processing' THEN
    FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = OLD.id ORDER BY product_id LOOP
      updated_product := NULL;
      UPDATE public.products SET stock_quantity = stock_quantity - item.quantity
        WHERE id = item.product_id AND status = 'published' AND stock_quantity >= item.quantity
        RETURNING id INTO updated_product;
      IF updated_product IS NULL THEN RAISE EXCEPTION 'Insufficient stock to process this order'; END IF;
    END LOOP;
    NEW.stock_reserved := true;
  ELSIF OLD.status = 'processing' AND NEW.status = 'cancelled' AND OLD.stock_reserved THEN
    FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = OLD.id ORDER BY product_id LOOP
      UPDATE public.products SET stock_quantity = stock_quantity + item.quantity WHERE id = item.product_id;
    END LOOP;
    NEW.stock_reserved := false;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_inventory_on_processing() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.reserve_inventory_on_processing() TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_checkout_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE item jsonb; selected_product public.products%ROWTYPE; chosen_size text; chosen_color text;
  chosen_quantity integer; item_subtotal bigint := 0; total_items integer; distinct_items integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NEW.user_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Sign in with your own account before placing an order';
  END IF;
  IF NEW.status <> 'pending' OR NEW.stock_reserved OR NEW.tracking_number IS NOT NULL THEN
    RAISE EXCEPTION 'New orders must start as pending';
  END IF;
  IF jsonb_typeof(NEW.checkout_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(NEW.checkout_items) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Select between 1 and 20 different apparel items';
  END IF;
  IF NEW.shipping_name IS NULL OR char_length(trim(NEW.shipping_name)) NOT BETWEEN 2 AND 120
     OR NEW.shipping_email IS NULL OR char_length(trim(NEW.shipping_email)) NOT BETWEEN 3 AND 320
     OR position('@' IN NEW.shipping_email) < 2
     OR NEW.shipping_address IS NULL OR char_length(trim(NEW.shipping_address)) NOT BETWEEN 5 AND 240
     OR NEW.shipping_city IS NULL OR char_length(trim(NEW.shipping_city)) NOT BETWEEN 2 AND 100
     OR NEW.shipping_postal_code IS NULL OR char_length(trim(NEW.shipping_postal_code)) NOT BETWEEN 2 AND 24
     OR NEW.shipping_country IS NULL OR char_length(trim(NEW.shipping_country)) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Complete all required shipping details';
  END IF;
  IF NEW.currency <> 'USD' OR NEW.shipping_cents <> 0 THEN RAISE EXCEPTION 'Checkout uses USD and free shipping'; END IF;
  SELECT count(*), count(DISTINCT value->>'product_id') INTO total_items, distinct_items
    FROM jsonb_array_elements(NEW.checkout_items);
  IF total_items <> distinct_items THEN RAISE EXCEPTION 'Each apparel item can appear only once per order'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.checkout_items) AS items(value) ORDER BY value->>'product_id' LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid apparel item'; END IF;
    chosen_quantity := (item->>'quantity')::integer; chosen_size := item->>'size'; chosen_color := item->>'color';
    IF chosen_quantity NOT BETWEEN 1 AND 5 OR chosen_size NOT IN ('S','M','L','XL','XXL')
      OR chosen_color NOT IN ('ink','cherry','fern','cloud','navy') THEN
      RAISE EXCEPTION 'Choose an available size, color, and quantity for every item';
    END IF;
    SELECT * INTO selected_product FROM public.products WHERE id = (item->>'product_id')::uuid AND status = 'published' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'An apparel item is no longer available'; END IF;
    IF NOT chosen_color = ANY(selected_product.color_options) THEN RAISE EXCEPTION 'That color is no longer available'; END IF;
    IF selected_product.stock_quantity < chosen_quantity THEN RAISE EXCEPTION 'Insufficient stock for %', selected_product.name; END IF;
    item_subtotal := item_subtotal + selected_product.price_cents::bigint * chosen_quantity;
  END LOOP;
  IF item_subtotal < 1 OR item_subtotal > 2147483647 THEN RAISE EXCEPTION 'Order exceeds the accepted amount'; END IF;
  NEW.shipping_name := trim(NEW.shipping_name); NEW.shipping_email := lower(trim(NEW.shipping_email));
  NEW.shipping_address := trim(NEW.shipping_address); NEW.shipping_city := trim(NEW.shipping_city);
  NEW.shipping_postal_code := trim(NEW.shipping_postal_code); NEW.shipping_country := trim(NEW.shipping_country);
  NEW.subtotal_cents := item_subtotal::integer; NEW.total_cents := item_subtotal::integer;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_checkout_order() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.prepare_checkout_order() TO service_role;

CREATE OR REPLACE FUNCTION public.create_checkout_order_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE item jsonb; selected_product public.products%ROWTYPE;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.checkout_items) AS items(value) LOOP
    SELECT * INTO selected_product FROM public.products WHERE id = (item->>'product_id')::uuid AND status = 'published';
    INSERT INTO public.order_items (order_id, product_id, product_name, product_slug, image_key, size, color, quantity, unit_price_cents)
      VALUES (NEW.id, selected_product.id, selected_product.name, selected_product.slug, selected_product.image_key,
        item->>'size', item->>'color', (item->>'quantity')::integer, selected_product.price_cents);
  END LOOP;
  UPDATE public.orders SET checkout_items = NULL WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_checkout_order_items() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.create_checkout_order_items() TO service_role;

CREATE TRIGGER orders_prepare_checkout BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.prepare_checkout_order();
CREATE TRIGGER orders_create_order_items AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.create_checkout_order_items();