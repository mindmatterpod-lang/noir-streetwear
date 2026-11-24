import { describe, expect, it } from "vitest";

import { computeTotals, DEFAULT_SETTINGS } from "@/lib/pricing";
import { shippingProgress } from "@/lib/shipping-progress";

describe("shippingProgress", () => {
  it("shows the amount remaining and a percentage below the threshold", () => {
    const p = shippingProgress(550000, 750000, 25000);
    expect(p).toMatchObject({
      applicable: true,
      unlocked: false,
      remainingCents: 200000,
      percent: 73,
    });
  });
  it("unlocks exactly at the threshold, matching the checkout calculation", () => {
    expect(shippingProgress(750000, 750000, 25000)).toMatchObject({
      unlocked: true,
      remainingCents: 0,
      percent: 100,
    });
    expect(computeTotals(750000, 0, DEFAULT_SETTINGS).shipping).toBe(0);
    expect(computeTotals(749999, 0, DEFAULT_SETTINGS).shipping).toBe(25000);
  });
  it("is not applicable without a threshold, with free delivery already, or with an empty bag", () => {
    expect(shippingProgress(100, null, 25000).applicable).toBe(false);
    expect(shippingProgress(100, 750000, 0).applicable).toBe(false);
    expect(shippingProgress(0, 750000, 25000).applicable).toBe(false);
  });
});
