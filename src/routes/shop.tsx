import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  countActiveFilters,
  filterProducts,
  sortProducts,
  type CatalogFilters,
} from "@/lib/catalog-filters";
import { formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site-config";
import { useProducts } from "@/lib/products-api";
import {
  CORE_CATEGORIES,
  COLOR_NAMES,
  COLOR_SWATCH,
  type CatalogSort,
  type ProductColor,
} from "@/types/store";

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-ascending", label: "Price: low to high" },
  { value: "price-descending", label: "Price: high to low" },
  { value: "name-ascending", label: "Alphabetical (A–Z)" },
];
const ALL_COLORS = Object.keys(COLOR_NAMES) as ProductColor[];

type ShopSearch = {
  category?: string | undefined;
  q?: string | undefined;
  sort?: CatalogSort | undefined;
  /** Comma-separated colour keys. */
  colors?: string | undefined;
  /** Price bounds in whole rupees. */
  min?: number | undefined;
  max?: number | undefined;
  stock?: 1 | undefined;
};

function parseColors(value: string | undefined): ProductColor[] {
  return (value ?? "")
    .split(",")
    .filter((c): c is ProductColor => (ALL_COLORS as string[]).includes(c));
}
function parseRupees(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? Math.floor(n) : undefined;
}

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const result: ShopSearch = {};
    const category = search["category"];
    if (typeof category === "string" && (CORE_CATEGORIES as readonly string[]).includes(category))
      result.category = category;
    const q = search["q"];
    if (typeof q === "string" && q !== "") result.q = q.slice(0, 80);
    const sort = search["sort"];
    if (SORTS.some((s) => s.value === sort)) result.sort = sort as CatalogSort;
    const colors = parseColors(typeof search["colors"] === "string" ? search["colors"] : undefined);
    if (colors.length > 0) result.colors = colors.join(",");
    const min = parseRupees(search["min"]);
    if (min !== undefined) result.min = min;
    const max = parseRupees(search["max"]);
    if (max !== undefined) result.max = max;
    if (search["stock"] === 1 || search["stock"] === "1") result.stock = 1;
    return result;
  },
  head: ({ match }) => {
    const search = match.search as ShopSearch;
    const category = search.category;
    const title = category ? `${category} — Nowhere` : "Shop all pieces — Nowhere";
    const description = category
      ? `Shop NOWHERE ${category.toLowerCase()}: premium contemporary streetwear designed in Pakistan.`
      : "Browse hoodies, tracksuits, jackets, trousers and shirts from NOWHERE.";
    // Filtered, searched and sorted views are duplicates of the main collection page, so they are kept out of search results.
    const filtered = !!(
      search.q ||
      search.colors ||
      search.min !== undefined ||
      search.max !== undefined ||
      search.stock ||
      search.sort
    );
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        {
          property: "og:url",
          content: `${SITE_URL}/shop${category ? `?category=${encodeURIComponent(category)}` : ""}`,
        },
        ...(filtered ? [{ name: "robots", content: "noindex,follow" }] : []),
      ],
      links: [
        {
          rel: "canonical",
          href: `${SITE_URL}/shop${category ? `?category=${encodeURIComponent(category)}` : ""}`,
        },
      ],
    };
  },
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const category = search.category ?? "All pieces";
  const q = search.q ?? "";
  const sort = search.sort ?? "featured";
  const colors = parseColors(search.colors);
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: products = [] } = useProducts();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters: CatalogFilters = {
    category,
    q,
    colors,
    minCents: search.min !== undefined ? search.min * 100 : undefined,
    maxCents: search.max !== undefined ? search.max * 100 : undefined,
    inStockOnly: search.stock === 1,
  };
  const results = useMemo(
    () => sortProducts(filterProducts(products, filters), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, category, q, search.colors, search.min, search.max, search.stock, sort],
  );
  // Only offer colours and price bounds that exist in the catalogue.
  const availableColors = useMemo(
    () => ALL_COLORS.filter((c) => products.some((p) => p.colors.includes(c))),
    [products],
  );
  const priceRange = useMemo(() => {
    const prices = products.map((p) => p.priceCents);
    return prices.length
      ? { min: Math.floor(Math.min(...prices) / 100), max: Math.ceil(Math.max(...prices) / 100) }
      : null;
  }, [products]);

  const update = (next: ShopSearch) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  const toggleColor = (c: ProductColor) => {
    const next = colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c];
    update({ colors: next.length ? next.join(",") : undefined });
  };
  const clearAll = () =>
    update({
      category: undefined,
      colors: undefined,
      min: undefined,
      max: undefined,
      stock: undefined,
    });
  const activeCount = countActiveFilters(filters);

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(category !== "All pieces"
      ? [{ key: "cat", label: category, remove: () => update({ category: undefined }) }]
      : []),
    ...colors.map((c) => ({
      key: `c-${c}`,
      label: COLOR_NAMES[c],
      remove: () => toggleColor(c),
    })),
    ...(search.min !== undefined || search.max !== undefined
      ? [
          {
            key: "price",
            label: `${search.min !== undefined ? formatPrice(search.min * 100) : "Any"} – ${search.max !== undefined ? formatPrice(search.max * 100) : "Any"}`,
            remove: () => update({ min: undefined, max: undefined }),
          },
        ]
      : []),
    ...(search.stock === 1
      ? [{ key: "stock", label: "In stock", remove: () => update({ stock: undefined }) }]
      : []),
  ];

  const sectionTitle = "text-[11px] font-medium uppercase tracking-[0.24em]";
  const numberInput =
    "h-11 w-full border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-2";

  return (
    <SiteLayout>
      <div className="page-container py-10 md:py-14">
        <header>
          <h1 className="display-heading text-[clamp(2.75rem,10vw,5.5rem)]">{category}</h1>
          <p className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite">
            {results.length} {results.length === 1 ? "piece" : "pieces"}
            {results.length !== products.length ? ` of ${products.length}` : ""}
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search products"
              placeholder="Search pieces"
              className="h-11 pl-9"
              value={q}
              onChange={(e) => update({ q: e.target.value || undefined })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 uppercase tracking-[0.18em]"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => update({ sort: e.target.value as CatalogSort })}
            className="h-11 border border-input bg-background px-3 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={chip.remove}
                  aria-label={`Remove filter: ${chip.label}`}
                  className="flex min-h-9 items-center gap-2 border border-border px-3 text-xs uppercase tracking-[0.14em] transition-colors hover:bg-secondary"
                >
                  {chip.label}
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={clearAll}
                className="min-h-9 px-2 text-xs uppercase tracking-[0.14em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Clear all
              </button>
            </li>
          </ul>
        )}

        {results.length === 0 ? (
          <div className="py-24 text-center">
            <p className="display-heading text-4xl">Nothing matches.</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Try removing a filter or searching for something else.
            </p>
            <Button
              type="button"
              className="mt-6 uppercase tracking-[0.18em]"
              onClick={() => {
                clearAll();
                update({ q: undefined });
              }}
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {results.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border p-5 text-left">
            <SheetTitle className="display-heading text-3xl">Filters</SheetTitle>
            <SheetDescription className="sr-only">
              Narrow the collection by category, colour, price and availability.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-8 overflow-y-auto p-5">
            <fieldset>
              <legend className={sectionTitle}>Category</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {["All pieces", ...CORE_CATEGORIES].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={c === category}
                    onClick={() => update({ category: c === "All pieces" ? undefined : c })}
                    className={`min-h-11 border px-4 text-xs uppercase tracking-[0.14em] transition-colors ${c === category ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>

            {availableColors.length > 0 && (
              <fieldset>
                <legend className={sectionTitle}>Colour</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableColors.map((c) => {
                    const on = colors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleColor(c)}
                        className={`flex min-h-11 items-center gap-2 border px-3 text-xs uppercase tracking-[0.14em] transition-colors ${on ? "border-primary bg-secondary" : "border-border hover:bg-secondary"}`}
                      >
                        <span
                          aria-hidden="true"
                          className="size-4 rounded-full border border-foreground/25"
                          style={{ backgroundColor: COLOR_SWATCH[c] }}
                        />
                        {COLOR_NAMES[c]}
                        {on && <Check className="size-3" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {priceRange && (
              <fieldset>
                <legend className={sectionTitle}>Price (Rs)</legend>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Min
                    <input
                      inputMode="numeric"
                      type="number"
                      min={0}
                      placeholder={String(priceRange.min)}
                      value={search.min ?? ""}
                      onChange={(e) => update({ min: parseRupees(e.target.value) })}
                      className={`${numberInput} mt-1`}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Max
                    <input
                      inputMode="numeric"
                      type="number"
                      min={0}
                      placeholder={String(priceRange.max)}
                      value={search.max ?? ""}
                      onChange={(e) => update({ max: parseRupees(e.target.value) })}
                      className={`${numberInput} mt-1`}
                    />
                  </label>
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className={sectionTitle}>Availability</legend>
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-primary)]"
                  checked={search.stock === 1}
                  onChange={(e) => update({ stock: e.target.checked ? 1 : undefined })}
                />
                In stock only
              </label>
            </fieldset>
          </div>
          <SheetFooter className="flex-row gap-3 border-t border-border p-5">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 uppercase tracking-[0.16em]"
              disabled={activeCount === 0}
              onClick={clearAll}
            >
              Clear all
            </Button>
            <Button
              type="button"
              className="h-12 flex-[2] uppercase tracking-[0.16em]"
              onClick={() => setDrawerOpen(false)}
            >
              Show {results.length} {results.length === 1 ? "piece" : "pieces"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}
