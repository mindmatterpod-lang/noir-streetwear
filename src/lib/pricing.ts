export interface StoreSettings {
  shipping_flat_cents: number;
  free_shipping_threshold_cents: number | null;
  tax_rate_bps: number;
  cod_enabled: boolean;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  shipping_flat_cents: 800,
  free_shipping_threshold_cents: 15000,
  tax_rate_bps: 0,
  cod_enabled: true,
};

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

/** Mirrors create_order_from_checkout in docs/shopify-parity.sql. The database result is always authoritative. */
export function computeTotals(subtotal: number, discount: number, settings: StoreSettings): Totals {
  const net = subtotal - discount;
  const threshold = settings.free_shipping_threshold_cents;
  const shipping = threshold !== null && net >= threshold ? 0 : settings.shipping_flat_cents;
  const tax = Math.round((net * settings.tax_rate_bps) / 10000);
  return { subtotal, discount, shipping, tax, total: net + shipping + tax };
}
