import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/pricing";

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    staleTime: 60_000,
    placeholderData: DEFAULT_SETTINGS,
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await db
        .from("store_settings")
        .select("shipping_flat_cents, free_shipping_threshold_cents, tax_rate_bps, cod_enabled")
        .maybeSingle();
      if (error || !data) return DEFAULT_SETTINGS;
      return data as StoreSettings;
    },
  });
}
