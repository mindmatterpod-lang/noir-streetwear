import { useEffect, useState } from "react";

const KEY = "nowhere-recent-v1";
const MAX = 8;

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Remembers the slugs of products this visitor opened, most recent first. Returns the list as it was before this visit. */
export function useRecentlyViewed(currentSlug: string): string[] {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const before = read();
    setSlugs(before.filter((s) => s !== currentSlug));
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify([currentSlug, ...before.filter((s) => s !== currentSlug)].slice(0, MAX)),
      );
    } catch {
      // Recently viewed is a convenience; ignore blocked storage.
    }
  }, [currentSlug]);
  return slugs;
}
