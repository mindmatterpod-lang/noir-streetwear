import { describe, expect, it } from "vitest";

import { POLICIES } from "@/lib/policies";

describe("policy pages", () => {
  it("covers shipping/returns, size guide, contact, privacy and terms", () => {
    expect(Object.keys(POLICIES).sort()).toEqual([
      "contact",
      "privacy",
      "shipping-returns",
      "size-guide",
      "terms",
    ]);
  });
  it("every page has content, and the size guide has a row per size", () => {
    for (const policy of Object.values(POLICIES)) expect(policy.sections.length).toBeGreaterThan(0);
    expect(POLICIES["size-guide"]?.table?.rows.map((r) => r[0])).toEqual([
      "S",
      "M",
      "L",
      "XL",
      "XXL",
    ]);
  });
});
