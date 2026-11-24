export interface ShippingProgress {
  /** False when there is nothing to show: no threshold configured, delivery is already free, or the bag is empty. */
  applicable: boolean;
  unlocked: boolean;
  remainingCents: number;
  /** 0–100 */
  percent: number;
}

/**
 * Free-delivery progress from the merchandise subtotal. The thresholds come from store settings, never hard-coded.
 * Mirrors computeTotals in pricing.ts, where free delivery is checked against subtotal minus any discount code.
 */
export function shippingProgress(
  subtotalCents: number,
  thresholdCents: number | null | undefined,
  flatShippingCents: number,
): ShippingProgress {
  if (thresholdCents == null || thresholdCents <= 0 || flatShippingCents <= 0 || subtotalCents <= 0)
    return { applicable: false, unlocked: false, remainingCents: 0, percent: 0 };
  const unlocked = subtotalCents >= thresholdCents;
  return {
    applicable: true,
    unlocked,
    remainingCents: Math.max(0, thresholdCents - subtotalCents),
    percent: Math.min(100, Math.floor((subtotalCents / thresholdCents) * 100)),
  };
}
