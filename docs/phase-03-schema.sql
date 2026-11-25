-- NOWHERE Phase 03 schema: newsletter, marketing campaigns, notification log.
-- AGENTS.md says schema changes go through Lovable: ask Lovable to apply this file, or run it in the Supabase SQL editor.
-- Until it is applied the storefront keeps working: the newsletter form says sign-up is not available yet,
-- no campaign banner shows, and order emails fall back to an in-memory duplicate guard.
-- Requires the existing public.has_role(text) function and public.update_updated_at_column().

-- ───────────── Newsletter subscribers (written only by the server, using the service role)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320 AND email = lower(email)),
  status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  source text NOT NULL DEFAULT 'website' CHECK (char_length(source) <= 40),
  unsubscribe_token text NOT NULL UNIQUE CHECK (unsubscribe_token ~ '^[a-f0-9]{48}$'),
  consent_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
GRANT SELECT ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
DROP POLICY IF EXISTS "Admins read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.has_role('admin'));
DROP TRIGGER IF EXISTS newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER newsletter_subscribers_updated_at BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────── Marketing campaigns (homepage banner). Visitors only ever see active, in-window rows.
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  cta_label text CHECK (cta_label IS NULL OR char_length(cta_label) <= 40),
  cta_url text CHECK (cta_url IS NULL OR (cta_url ~ '^/[^/]' OR cta_url = '/' OR cta_url ~ '^https://')),
  image_url text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
DROP POLICY IF EXISTS "Public sees live campaigns" ON public.campaigns;
CREATE POLICY "Public sees live campaigns" ON public.campaigns FOR SELECT TO anon, authenticated
  USING ((active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())) OR public.has_role('admin'));
DROP POLICY IF EXISTS "Admins write campaigns" ON public.campaigns;
CREATE POLICY "Admins write campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────── Notification log: one row per (order, message kind, channel). The UNIQUE key is what prevents duplicate sends.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('confirmation', 'processing', 'shipped', 'delivered', 'cancelled')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  error text CHECK (error IS NULL OR char_length(error) <= 500),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, kind, channel)
);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_log FROM anon, authenticated;
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
DROP POLICY IF EXISTS "Admins read notification log" ON public.notification_log;
CREATE POLICY "Admins read notification log" ON public.notification_log FOR SELECT TO authenticated
  USING (public.has_role('admin'));
