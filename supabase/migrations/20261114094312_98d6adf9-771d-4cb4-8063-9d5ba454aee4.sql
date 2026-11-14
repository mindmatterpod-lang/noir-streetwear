CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('Hoodies', 'Tracksuits', 'Jackets', 'Trousers', 'Shirts')),
  slug text NOT NULL UNIQUE CHECK (slug IN ('hoodies', 'tracksuits', 'jackets', 'trousers', 'shirts')),
  sort_order integer NOT NULL CHECK (sort_order BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published category list is public" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2400),
  sku text NOT NULL UNIQUE,
  image_key text NOT NULL CHECK (image_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  color_options text[] NOT NULL DEFAULT ARRAY['ink']::text[],
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 1 AND 10000000),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_color_options_valid CHECK (
    cardinality(color_options) BETWEEN 1 AND 5
    AND color_options <@ ARRAY['ink', 'cherry', 'fern', 'cloud', 'navy']::text[]
  )
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published apparel is visible to everyone" ON public.products
  FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  shipping_name text NOT NULL CHECK (char_length(trim(shipping_name)) BETWEEN 2 AND 120),
  shipping_email text NOT NULL CHECK (char_length(shipping_email) BETWEEN 3 AND 320),
  shipping_address text NOT NULL CHECK (char_length(trim(shipping_address)) BETWEEN 5 AND 240),
  shipping_city text NOT NULL CHECK (char_length(trim(shipping_city)) BETWEEN 2 AND 100),
  shipping_postal_code text NOT NULL CHECK (char_length(trim(shipping_postal_code)) BETWEEN 2 AND 24),
  shipping_country text NOT NULL CHECK (char_length(trim(shipping_country)) BETWEEN 2 AND 100),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents > 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents = 0),
  total_cents integer NOT NULL CHECK (total_cents = subtotal_cents + shipping_cents),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  stock_reserved boolean NOT NULL DEFAULT false,
  tracking_number text CHECK (tracking_number IS NULL OR char_length(tracking_number) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers may read their own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  product_slug text NOT NULL,
  image_key text NOT NULL,
  size text NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
  color text NOT NULL CHECK (color IN ('ink', 'cherry', 'fern', 'cloud', 'navy')),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 5),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers may read their own order items" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders AS o
      WHERE o.id = order_items.order_id AND o.user_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO anon, authenticated;

CREATE POLICY "Accounts may read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.has_role('admin'));
CREATE POLICY "Admins may read all apparel products" ON public.products
  FOR SELECT TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Admins may add apparel products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins may update apparel products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins may remove apparel products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Customers and admins may read their own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.has_role('admin'));
CREATE POLICY "Admins may update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins may read order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role('admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.reserve_inventory_on_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item record;
  updated_product uuid;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled'))
    OR (OLD.status = 'processing' AND NEW.status IN ('shipped', 'cancelled'))
    OR (OLD.status = 'shipped' AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'processing' THEN
    FOR item IN
      SELECT product_id, quantity FROM public.order_items
      WHERE order_id = OLD.id ORDER BY product_id
    LOOP
      updated_product := NULL;
      UPDATE public.products
      SET stock_quantity = stock_quantity - item.quantity
      WHERE id = item.product_id AND status = 'published' AND stock_quantity >= item.quantity
      RETURNING id INTO updated_product;
      IF updated_product IS NULL THEN
        RAISE EXCEPTION 'Insufficient stock to process this order';
      END IF;
    END LOOP;
    NEW.stock_reserved := true;
  ELSIF OLD.status = 'processing' AND NEW.status = 'cancelled' AND OLD.stock_reserved THEN
    FOR item IN
      SELECT product_id, quantity FROM public.order_items
      WHERE order_id = OLD.id ORDER BY product_id
    LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + item.quantity
      WHERE id = item.product_id;
    END LOOP;
    NEW.stock_reserved := false;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_inventory_on_status_change BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.reserve_inventory_on_processing();

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_items jsonb,
  p_shipping_name text,
  p_shipping_email text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postal_code text,
  p_shipping_country text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_order_id uuid;
  item jsonb;
  selected_product public.products%ROWTYPE;
  chosen_size text;
  chosen_color text;
  chosen_quantity integer;
  item_subtotal bigint := 0;
  total_items integer;
  distinct_items integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sign in before placing an order';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Select between 1 and 20 different apparel items';
  END IF;
  IF p_shipping_name IS NULL OR char_length(trim(p_shipping_name)) NOT BETWEEN 2 AND 120
     OR p_shipping_email IS NULL OR char_length(trim(p_shipping_email)) NOT BETWEEN 3 AND 320
     OR position('@' IN p_shipping_email) < 2
     OR p_shipping_address IS NULL OR char_length(trim(p_shipping_address)) NOT BETWEEN 5 AND 240
     OR p_shipping_city IS NULL OR char_length(trim(p_shipping_city)) NOT BETWEEN 2 AND 100
     OR p_shipping_postal_code IS NULL OR char_length(trim(p_shipping_postal_code)) NOT BETWEEN 2 AND 24
     OR p_shipping_country IS NULL OR char_length(trim(p_shipping_country)) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Complete all required shipping details';
  END IF;

  SELECT count(*), count(DISTINCT value->>'product_id')
  INTO total_items, distinct_items
  FROM jsonb_array_elements(p_items);
  IF total_items <> distinct_items THEN
    RAISE EXCEPTION 'Each apparel item can appear only once per order';
  END IF;

  FOR item IN
    SELECT value FROM jsonb_array_elements(p_items) AS items(value)
    ORDER BY value->>'product_id'
  LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid apparel item';
    END IF;
    chosen_quantity := (item->>'quantity')::integer;
    chosen_size := item->>'size';
    chosen_color := item->>'color';
    IF chosen_quantity NOT BETWEEN 1 AND 5
       OR chosen_size NOT IN ('S', 'M', 'L', 'XL', 'XXL')
       OR chosen_color NOT IN ('ink', 'cherry', 'fern', 'cloud', 'navy') THEN
      RAISE EXCEPTION 'Choose an available size, color, and quantity for every item';
    END IF;

    SELECT * INTO selected_product FROM public.products
    WHERE id = (item->>'product_id')::uuid AND status = 'published'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'An apparel item is no longer available';
    END IF;
    IF NOT chosen_color = ANY(selected_product.color_options) THEN
      RAISE EXCEPTION 'That color is no longer available';
    END IF;
    IF selected_product.stock_quantity < chosen_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', selected_product.name;
    END IF;
    item_subtotal := item_subtotal + (selected_product.price_cents::bigint * chosen_quantity);
  END LOOP;

  IF item_subtotal > 2147483647 THEN
    RAISE EXCEPTION 'Order exceeds the accepted amount';
  END IF;

  INSERT INTO public.orders (
    user_id, shipping_name, shipping_email, shipping_address, shipping_city,
    shipping_postal_code, shipping_country, subtotal_cents, total_cents, status
  ) VALUES (
    (SELECT auth.uid()), trim(p_shipping_name), lower(trim(p_shipping_email)),
    trim(p_shipping_address), trim(p_shipping_city), trim(p_shipping_postal_code),
    trim(p_shipping_country), item_subtotal::integer, item_subtotal::integer, 'pending'
  ) RETURNING id INTO new_order_id;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) AS items(value)
  LOOP
    SELECT * INTO selected_product FROM public.products
    WHERE id = (item->>'product_id')::uuid AND status = 'published';
    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_slug, image_key,
      size, color, quantity, unit_price_cents
    ) VALUES (
      new_order_id, selected_product.id, selected_product.name, selected_product.slug,
      selected_product.image_key, item->>'size', item->>'color',
      (item->>'quantity')::integer, selected_product.price_cents
    );
  END LOOP;

  RETURN new_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(jsonb, text, text, text, text, text, text) TO authenticated;

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Hoodies', 'hoodies', 1),
  ('Tracksuits', 'tracksuits', 2),
  ('Jackets', 'jackets', 3),
  ('Trousers', 'trousers', 4),
  ('Shirts', 'shirts', 5);

INSERT INTO public.products (
  category_id, slug, name, description, sku, image_key, color_options,
  price_cents, stock_quantity, status, is_featured
)
SELECT c.id, item.slug, item.name, item.description, item.sku, item.image_key,
  item.color_options, item.price_cents, item.stock_quantity, 'published', item.is_featured
FROM (VALUES
  ('hoodies', 'studio-hoodie', 'Studio Heavyweight Hoodie', 'A substantial brushed-cotton layer with a relaxed drape and considered everyday weight.', 'AF-HOD-001', 'core-hoodie', ARRAY['cherry', 'ink', 'cloud']::text[], 11800, 24, true),
  ('hoodies', 'after-hours-hoodie', 'After Hours Hoodie', 'A generously cut pullover in deep burgundy fleece, finished with a structured double-layer hood.', 'AF-HOD-002', 'core-hoodie', ARRAY['cherry', 'ink']::text[], 12400, 16, true),
  ('tracksuits', 'evergreen-track-set', 'Evergreen Track Set', 'A matching technical warm-up set with clean piping, light movement and a quietly confident finish.', 'AF-TRK-001', 'core-tracksuit', ARRAY['fern', 'ink']::text[], 17600, 12, true),
  ('tracksuits', 'midnight-track-set', 'Midnight Track Set', 'A full two-piece track set cut in a smooth midnight technical knit with subtle red edge piping.', 'AF-TRK-002', 'navy-tracksuit', ARRAY['navy', 'ink']::text[], 18400, 9, false),
  ('jackets', 'signal-shell-jacket', 'Signal Shell Jacket', 'A lightweight technical layer with practical storage and a vivid red shell that stands on its own.', 'AF-JKT-001', 'technical-jacket', ARRAY['cherry', 'ink', 'fern']::text[], 15200, 14, true),
  ('jackets', 'city-bomber', 'City Bomber', 'The everyday bomber, rethought in a quiet graphite finish with a soft technical hand.', 'AF-JKT-002', 'bomber-jacket', ARRAY['ink', 'navy']::text[], 16400, 8, false),
  ('trousers', 'utility-wide-trouser', 'Utility Wide Trouser', 'Easy, considered volume meets hard-wearing everyday utility in a clean black twill.', 'AF-TRS-001', 'utility-trousers', ARRAY['ink', 'navy']::text[], 11200, 22, false),
  ('trousers', 'form-pleated-trouser', 'Form Pleated Trouser', 'A wide straight-leg shape, with front pleats and just enough structure for every day.', 'AF-TRS-002', 'tailored-trousers', ARRAY['ink', 'cloud']::text[], 12600, 11, true),
  ('shirts', 'essential-poplin-shirt', 'Essential Poplin Shirt', 'A precise heavyweight-cotton shirt with a relaxed silhouette and an easy open collar.', 'AF-SHR-001', 'oversized-shirt', ARRAY['cloud', 'ink']::text[], 9200, 20, false),
  ('shirts', 'blue-hour-shirt', 'Blue Hour Stripe Shirt', 'A light, relaxed poplin in subtle blue stripes. An effortless layer, morning to midnight.', 'AF-SHR-002', 'striped-shirt', ARRAY['cloud', 'navy']::text[], 9800, 17, true)
) AS item(category_slug, slug, name, description, sku, image_key, color_options, price_cents, stock_quantity, is_featured)
JOIN public.categories AS c ON c.slug = item.category_slug;