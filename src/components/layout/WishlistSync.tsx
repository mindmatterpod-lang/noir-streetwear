import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { readProfile, updateProfile } from "@/hooks/use-profile";
import { replaceWishlist, useWishlist } from "@/hooks/use-wishlist";

const same = (a: string[], b: string[]) => a.length === b.length && a.every((s, i) => s === b[i]);

/**
 * Keeps the wishlist in the signed-in customer's account. On sign-in the guest list and the saved list are merged
 * (no duplicates); afterwards changes are saved a moment after they happen. Guests keep using this browser's storage.
 */
export function WishlistSync() {
  const { user } = useAuth();
  const { slugs } = useWishlist();
  const mergedFor = useRef<string | null>(null);
  const saved = useRef<string[]>([]);
  const pending = useRef<string[] | null>(null);
  const signedIn = useRef(false);
  signedIn.current = !!user;

  useEffect(() => {
    if (!user || mergedFor.current === user.id) return;
    mergedFor.current = user.id;
    const remote = readProfile(user).wishlist;
    const merged = [...new Set([...remote, ...slugs])];
    saved.current = remote;
    replaceWishlist(merged);
    if (!same(merged, remote)) {
      saved.current = merged;
      void updateProfile({ wishlist: merged }).catch(() => undefined);
    }
    // Only runs when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || mergedFor.current !== user.id || same(slugs, saved.current)) return;
    pending.current = slugs;
    const timer = setTimeout(() => {
      saved.current = slugs;
      pending.current = null;
      void updateProfile({ wishlist: slugs }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [slugs, user]);

  // Leaving the page within the save delay must not lose (or resurrect) a change.
  useEffect(
    () => () => {
      if (pending.current && signedIn.current) {
        void updateProfile({ wishlist: pending.current }).catch(() => undefined);
        pending.current = null;
      }
    },
    [],
  );

  return null;
}
