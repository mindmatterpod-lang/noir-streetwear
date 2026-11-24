import type { CatalogSort, Product, ProductColor } from "@/types/store";

export interface CatalogFilters {
  category?: string | undefined;
  q?: string | undefined;
  colors?: readonly ProductColor[] | undefined;
  /** Prices are in paisa, like Product.priceCents. */
  minCents?: number | undefined;
  maxCents?: number | undefined;
  inStockOnly?: boolean | undefined;
}

/** Filters combine with AND. Colours inside one filter combine with OR (any selected colour). */
export function filterProducts(products: readonly Product[], f: CatalogFilters): Product[] {
  const needle = (f.q ?? "").trim().toLocaleLowerCase();
  const colors = f.colors ?? [];
  return products.filter((p) => {
    if (f.category && f.category !== "All pieces" && p.category !== f.category) return false;
    if (needle && !`${p.name} ${p.description} ${p.category}`.toLocaleLowerCase().includes(needle))
      return false;
    if (colors.length > 0 && !p.colors.some((c) => colors.includes(c))) return false;
    if (f.minCents !== undefined && p.priceCents < f.minCents) return false;
    if (f.maxCents !== undefined && p.priceCents > f.maxCents) return false;
    if (f.inStockOnly && p.stock <= 0) return false;
    return true;
  });
}

/** Returns a new sorted array. "Featured" puts flagged pieces (bestsellers, new arrivals) first, then keeps catalogue order. */
export function sortProducts(products: readonly Product[], sort: CatalogSort): Product[] {
  const indexed = products.map((product, index) => ({ product, index }));
  const byIndex = (a: { index: number }, b: { index: number }) => a.index - b.index;
  switch (sort) {
    case "price-ascending":
      indexed.sort((a, b) => a.product.priceCents - b.product.priceCents || byIndex(a, b));
      break;
    case "price-descending":
      indexed.sort((a, b) => b.product.priceCents - a.product.priceCents || byIndex(a, b));
      break;
    case "newest":
      indexed.sort(
        (a, b) => b.product.createdAt.localeCompare(a.product.createdAt) || byIndex(a, b),
      );
      break;
    case "name-ascending":
      indexed.sort((a, b) => a.product.name.localeCompare(b.product.name) || byIndex(a, b));
      break;
    default:
      indexed.sort(
        (a, b) =>
          Number(Boolean(b.product.badge)) - Number(Boolean(a.product.badge)) || byIndex(a, b),
      );
  }
  return indexed.map((entry) => entry.product);
}

export function countActiveFilters(f: CatalogFilters): number {
  return (
    (f.category && f.category !== "All pieces" ? 1 : 0) +
    (f.colors?.length ?? 0) +
    (f.minCents !== undefined || f.maxCents !== undefined ? 1 : 0) +
    (f.inStockOnly ? 1 : 0)
  );
}
