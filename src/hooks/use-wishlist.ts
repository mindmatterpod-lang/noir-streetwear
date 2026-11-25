import { useSyncExternalStore } from "react";

import { events } from "@/lib/analytics";

const KEY = "nowhere-wishlist-v1";
const EMPTY: string[] = [];
let snapshot: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Keep working in memory.
  }
  for (const l of listeners) l();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    snapshot = Array.isArray(parsed)
      ? [...new Set(parsed.filter((v): v is string => typeof v === "string"))]
      : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const before = snapshot;
  load();
  if (before !== snapshot) listener();
  return () => listeners.delete(listener);
}

/** Replaces the saved list (used when a signed-in customer's wishlist is merged in). Duplicates are removed. */
export function replaceWishlist(slugs: string[]) {
  load();
  const next = [...new Set(slugs)];
  if (next.length === snapshot.length && next.every((s, i) => s === snapshot[i])) return;
  snapshot = next;
  persist();
}

export function useWishlist() {
  const slugs = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
  const toggle = (slug: string) => {
    const removing = snapshot.includes(slug);
    snapshot = removing ? snapshot.filter((s) => s !== slug) : [...snapshot, slug];
    events.wishlist(removing ? "remove" : "add", slug);
    persist();
  };
  return { slugs, has: (slug: string) => slugs.includes(slug), toggle };
}
