import { describe, expect, it } from "vitest";

import { formatPrice } from "@/lib/format";

describe("formatPrice (paisa -> Pakistani Rupees)", () => {
  it("formats whole rupees with thousands separators", () => {
    expect(formatPrice(649900)).toBe("Rs 6,499");
    expect(formatPrice(25000)).toBe("Rs 250");
    expect(formatPrice(1299800)).toBe("Rs 12,998");
  });
  it("keeps paisa when present", () => {
    expect(formatPrice(10050)).toBe("Rs 100.50");
  });
});
