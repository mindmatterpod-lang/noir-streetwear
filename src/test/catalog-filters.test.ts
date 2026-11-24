import { describe, expect, it } from "vitest";

import { countActiveFilters, filterProducts, sortProducts } from "@/lib/catalog-filters";
import { PRODUCTS } from "@/lib/store-catalog";

describe("filterProducts", () => {
  it("returns everything with no filters", () => {
    expect(filterProducts(PRODUCTS, {})).toHaveLength(PRODUCTS.length);
  });
  it("combines category, colour, price and stock filters", () => {
    const result = filterProducts(PRODUCTS, {
      category: "Hoodies",
      colors: ["ink"],
      maxCents: 680000,
      inStockOnly: true,
    });
    expect(result.map((p) => p.slug)).toEqual(["studio-hoodie"]);
  });
  it("treats several colours as any-of", () => {
    const result = filterProducts(PRODUCTS, { colors: ["fern", "navy"] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.colors.includes("fern") || p.colors.includes("navy"))).toBe(true);
  });
  it("applies price bounds inclusively", () => {
    const result = filterProducts(PRODUCTS, { minCents: 399900, maxCents: 429900 });
    expect(result.map((p) => p.priceCents).sort()).toEqual([399900, 429900]);
  });
  it("hides sold-out pieces when asked", () => {
    const soldOut = { ...PRODUCTS[0]!, slug: "gone", stock: 0 };
    expect(filterProducts([soldOut, ...PRODUCTS], { inStockOnly: true })).not.toContainEqual(
      soldOut,
    );
    expect(filterProducts([soldOut, ...PRODUCTS], {})).toContainEqual(soldOut);
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterProducts(PRODUCTS, { category: "Shirts", colors: ["cherry"] })).toEqual([]);
  });
});

describe("sortProducts", () => {
  it("sorts alphabetically, by price both ways and by newest without mutating the input", () => {
    const copy = [...PRODUCTS];
    const names = sortProducts(PRODUCTS, "name-ascending").map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const asc = sortProducts(PRODUCTS, "price-ascending").map((p) => p.priceCents);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortProducts(PRODUCTS, "price-descending").map((p) => p.priceCents);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const newest = sortProducts(PRODUCTS, "newest").map((p) => p.createdAt);
    expect(newest).toEqual([...newest].sort().reverse());
    expect(PRODUCTS).toEqual(copy);
  });
  it("puts flagged pieces first for featured", () => {
    const featured = sortProducts(PRODUCTS, "featured");
    const firstUnflagged = featured.findIndex((p) => !p.badge);
    expect(featured.slice(firstUnflagged).every((p) => !p.badge)).toBe(true);
  });
});

describe("countActiveFilters", () => {
  it("counts category, each colour, a price range and stock", () => {
    expect(countActiveFilters({})).toBe(0);
    expect(
      countActiveFilters({
        category: "Hoodies",
        colors: ["ink", "navy"],
        minCents: 1,
        inStockOnly: true,
      }),
    ).toBe(5);
    expect(countActiveFilters({ category: "All pieces" })).toBe(0);
  });
});
