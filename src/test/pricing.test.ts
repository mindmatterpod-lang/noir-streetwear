import { describe, expect, it } from "vitest";

import { computeTotals, DEFAULT_SETTINGS } from "@/lib/pricing";

describe("computeTotals (mirrors create_order_from_checkout)", () => {
  it("charges flat shipping below the free-shipping threshold", () => {
    expect(computeTotals(11800, 0, DEFAULT_SETTINGS)).toEqual({
      subtotal: 11800,
      discount: 0,
      shipping: 800,
      tax: 0,
      total: 12600,
    });
  });
  it("ships free at or above the threshold, measured after discount", () => {
    expect(computeTotals(15000, 0, DEFAULT_SETTINGS).shipping).toBe(0);
    expect(computeTotals(15000, 1, DEFAULT_SETTINGS).shipping).toBe(800);
  });
  it("applies tax to goods after discount", () => {
    const t = computeTotals(23600, 2360, {
      ...DEFAULT_SETTINGS,
      tax_rate_bps: 1000,
      free_shipping_threshold_cents: null,
    });
    expect(t.tax).toBe(2124);
    expect(t.total).toBe(23600 - 2360 + 800 + 2124);
  });
  it("never ships free when the threshold is disabled", () => {
    expect(
      computeTotals(999999, 0, { ...DEFAULT_SETTINGS, free_shipping_threshold_cents: null })
        .shipping,
    ).toBe(800);
  });
});
