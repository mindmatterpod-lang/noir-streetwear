import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
}
export const MAX_ADDRESSES = 3;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Profile details live in the signed-in user's own auth metadata, so they need no extra table and are only readable by
 * that user. Everything is re-validated here because metadata is user-editable.
 */
export function readProfile(user: User | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const rawAddresses = Array.isArray(meta["addresses"]) ? (meta["addresses"] as unknown[]) : [];
  const addresses: SavedAddress[] = rawAddresses.slice(0, MAX_ADDRESSES).flatMap((a) => {
    const r = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
    const address = str(r["address"], 240);
    return address
      ? [
          {
            id: str(r["id"], 40) || address,
            label: str(r["label"], 40),
            address,
            city: str(r["city"], 80),
            province: str(r["province"], 60),
            postal_code: str(r["postal_code"], 24),
          },
        ]
      : [];
  });
  const wishlist = Array.isArray(meta["wishlist"])
    ? (meta["wishlist"] as unknown[])
        .filter((v): v is string => typeof v === "string")
        .slice(0, 100)
    : [];
  return { name: str(meta["full_name"], 120), phone: str(meta["phone"], 32), addresses, wishlist };
}

export async function updateProfile(patch: {
  name?: string;
  phone?: string;
  addresses?: SavedAddress[];
  wishlist?: string[];
}) {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data["full_name"] = patch.name.trim().slice(0, 120);
  if (patch.phone !== undefined) data["phone"] = patch.phone.trim().slice(0, 32);
  if (patch.addresses !== undefined) data["addresses"] = patch.addresses.slice(0, MAX_ADDRESSES);
  if (patch.wishlist !== undefined) data["wishlist"] = patch.wishlist.slice(0, 100);
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}
