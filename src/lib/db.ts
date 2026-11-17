import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Untyped client for tables and functions added by docs/shopify-parity.sql.
 * Once Lovable regenerates src/integrations/supabase/types.ts after that migration, use `supabase` directly.
 */
export const db = supabase as unknown as SupabaseClient;
