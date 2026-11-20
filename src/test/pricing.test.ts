import { describe, expect, it } from "vitest";

import { computeTotals, DEFAULT_SETTINGS } from "@/lib/pricing";

// All amounts are paisa: Rs 6,499 = 649900.
describe("computeTotals (mirrors create_order_from_checkout)", () => {
  it("defaults to Rs 250 delivery and free delivery from Rs 7,500", () => {
    expect(DEFAULT_SETTINGS.shipping_flat_cents).toBe(25000);
    expect(DEFAULT_SETTINGS.free_shipping_threshold_cents).toBe(750000);
    expect(DEFAULT_SETTINGS.tax_rate_bps).toBe(0);
  });
  it("charges the delivery fee below the free-delivery threshold", () => {
    expect(computeTotals(649900, 0, DEFAULT_SETTINGS)).toEqual({
      subtotal: 649900,
      discount: 0,
      shipping: 25000,
      tax: 0,
      total: 674900,
    });
  });
  it("delivers free at or above the threshold, measured after discount", () => {
    expect(computeTotals(750000, 0, DEFAULT_SETTINGS).shipping).toBe(0);
    expect(computeTotals(750000, 1, DEFAULT_SETTINGS).shipping).toBe(25000);
  });
  it("applies tax to goods after discount", () => {
    const t = computeTotals(1299800, 129980, {
      ...DEFAULT_SETTINGS,
      tax_rate_bps: 1000,
      free_shipping_threshold_cents: null,
    });
    expect(t.tax).toBe(116982);
    expect(t.total).toBe(1299800 - 129980 + 25000 + 116982);
  });
  it("never delivers free when the threshold is disabled", () => {
    const settings = { ...DEFAULT_SETTINGS, free_shipping_threshold_cents: null };
    expect(computeTotals(99999900, 0, settings).shipping).toBe(25000);
  });
});
