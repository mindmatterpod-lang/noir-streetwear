import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/lib/products-api";
import { searchProducts } from "@/lib/store-catalog";
import { CORE_CATEGORIES, type CatalogSort } from "@/types/store";

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-ascending", label: "Price: low to high" },
  { value: "price-descending", label: "Price: high to low" },
];

type ShopSearch = { category?: string; q?: string; sort?: CatalogSort };

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
    return result;
  },
  head: () => ({
    meta: [
      { title: "Shop — Noir Streetwear" },
      { name: "description", content: "Browse hoodies, tracksuits, jackets, trousers and shirts." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const category = search.category ?? "All pieces";
  const q = search.q ?? "";
  const sort = search.sort ?? "featured";
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: products = [] } = useProducts();
  const results = useMemo(
    () => searchProducts([...products], q, category, sort),
    [products, q, category, sort],
  );
  const update = (next: ShopSearch) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black uppercase tracking-widest">{category}</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {["All pieces", ...CORE_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => update({ category: c })}
              aria-pressed={c === category}
              className={`border px-4 py-2 text-xs uppercase tracking-widest ${c === category ? "bg-primary text-primary-foreground" : "border-border"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search products"
              placeholder="Search pieces"
              className="pl-9"
              value={q}
              onChange={(e) => update({ q: e.target.value })}
            />
          </div>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => update({ sort: e.target.value as CatalogSort })}
            className="h-9 border border-input bg-background px-3 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? "piece" : "pieces"}
        </p>
        {results.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No pieces match your search.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
