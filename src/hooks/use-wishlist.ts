import { useSyncExternalStore } from "react";

const KEY = "nowhere-wishlist-v1";
const EMPTY: string[] = [];
let snapshot: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    snapshot = Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
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

export function useWishlist() {
  const slugs = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
  const toggle = (slug: string) => {
    snapshot = snapshot.includes(slug) ? snapshot.filter((s) => s !== slug) : [...snapshot, slug];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      // Keep working in memory.
    }
    for (const l of listeners) l();
  };
  return { slugs, has: (slug: string) => slugs.includes(slug), toggle };
}
