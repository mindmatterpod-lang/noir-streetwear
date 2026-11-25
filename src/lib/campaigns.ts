import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";

export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
}

/** A campaign is visible only while it is active and inside its start/end window. Checked again on the client. */
export function isLive(c: Campaign, now: number = Date.now()): boolean {
  return (
    c.active &&
    new Date(c.starts_at).getTime() <= now &&
    (!c.ends_at || new Date(c.ends_at).getTime() > now)
  );
}

/** Internal paths and https links only. Anything else (javascript:, data:, protocol-relative) is dropped. */
export function safeCtaUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^\/(?!\/)/.test(url)) return url;
  return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
}

/** The newest live campaign. Returns null when none exists or the campaigns table has not been created yet. */
export function useActiveCampaign() {
  return useQuery({
    queryKey: ["active-campaign"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<Campaign | null> => {
      const now = new Date().toISOString();
      const { data, error } = await db
        .from("campaigns")
        .select("id, title, description, cta_label, cta_url, image_url, starts_at, ends_at, active")
        .eq("active", true)
        .lte("starts_at", now)
        .order("starts_at", { ascending: false })
        .limit(5);
      if (error) return null;
      return ((data ?? []) as Campaign[]).find((c) => isLive(c)) ?? null;
    },
  });
}
