import { describe, expect, it } from "vitest";

import { CORE_CATEGORIES, PRODUCTS, searchProducts } from "@/lib/store-catalog";

describe("catalog", () => {
  it("has products in all five core categories", () => {
    for (const category of CORE_CATEGORIES)
      expect(PRODUCTS.some((p) => p.category === category)).toBe(true);
  });
  it("filters by category", () => {
    const hoodies = searchProducts([...PRODUCTS], "", "Hoodies", "featured");
    expect(hoodies.length).toBeGreaterThan(0);
    expect(hoodies.every((p) => p.category === "Hoodies")).toBe(true);
  });
  it("searches by keyword, case-insensitively", () => {
    const results = searchProducts([...PRODUCTS], "BOMBER", "All pieces", "featured");
    expect(results.map((p) => p.slug)).toContain("city-bomber");
  });
  it("sorts by price both ways and by newest", () => {
    const asc = searchProducts([...PRODUCTS], "", "All pieces", "price-ascending").map(
      (p) => p.priceCents,
    );
    const desc = searchProducts([...PRODUCTS], "", "All pieces", "price-descending").map(
      (p) => p.priceCents,
    );
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const newest = searchProducts([...PRODUCTS], "", "All pieces", "newest").map(
      (p) => p.createdAt,
    );
    expect(newest).toEqual([...newest].sort().reverse());
  });
});
