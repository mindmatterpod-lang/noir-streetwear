import { track as vercelTrack } from "@vercel/analytics";

type Value = string | number | boolean;

/** Parameter names that must never reach an analytics provider. */
const BLOCKED_KEY = /name|e-?mail|phone|mobile|address|card|token|password|city|postal/i;
const MAX_PROPS = 4;

/**
 * Keeps only small, flat, non-personal parameters. Product names are allowed because they are catalogue data:
 * the blocked pattern is therefore applied to keys other than `item_name`.
 */
export function sanitizeParams(params: Record<string, unknown>): Record<string, Value> {
  const clean: Record<string, Value> = {};
  for (const [key, value] of Object.entries(params)) {
    if (Object.keys(clean).length >= MAX_PROPS) break;
    if (key !== "item_name" && BLOCKED_KEY.test(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === "boolean") clean[key] = value;
    else if (typeof value === "string" && !/@|\d{7,}/.test(value)) clean[key] = value.slice(0, 120);
  }
  return clean;
}

/** Cookie-free Vercel Web Analytics custom event. Never throws and does nothing on the server. */
export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    vercelTrack(event, sanitizeParams(params));
  } catch {
    // Analytics must never break shopping.
  }
}

interface Item {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
}
const rupees = (cents: number) => Math.round(cents / 100);

export const events = {
  viewItem: (p: Item) =>
    track("view_item", {
      item_id: p.slug,
      item_category: p.category,
      value: rupees(p.priceCents),
      currency: "PKR",
    }),
  addToCart: (p: Item, quantity: number) =>
    track("add_to_cart", {
      item_id: p.slug,
      item_category: p.category,
      quantity,
      value: rupees(p.priceCents * quantity),
    }),
  removeFromCart: (slug: string, quantity: number) =>
    track("remove_from_cart", { item_id: slug, quantity }),
  wishlist: (action: "add" | "remove", slug: string) =>
    track(`wishlist_${action}`, { item_id: slug }),
  beginCheckout: (itemCount: number, valueCents: number) =>
    track("begin_checkout", { items: itemCount, value: rupees(valueCents), currency: "PKR" }),
  search: (term: string, results: number) => track("search", { search_term: term, results }),
  filter: (kind: string) => track("filter_use", { filter: kind }),
  newsletter: () => track("newsletter_signup"),
};

/**
 * Fires once per order per browser, and only for orders placed in the last two hours, so revisiting an old order from an
 * email, or refreshing the confirmation page, never records a second purchase.
 */
export function trackPurchaseOnce(
  orderId: string,
  valueCents: number,
  itemCount: number,
  createdAt: string,
): boolean {
  if (typeof window === "undefined") return false;
  if (Date.now() - new Date(createdAt).getTime() > 2 * 60 * 60_000) return false;
  const key = `nowhere-purchase-${orderId}`;
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, "1");
  } catch {
    // Without storage we cannot dedupe, so do not risk a duplicate purchase event.
    return false;
  }
  track("purchase", { value: rupees(valueCents), items: itemCount, currency: "PKR" });
  return true;
}
