import { useMemo } from "react";

import { ProductCard } from "@/components/shop/ProductCard";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useProducts } from "@/lib/products-api";
import type { Category, Product } from "@/types/store";

/** Which categories pair well with each other. This is the rule behind "Complete the look". */
const COMPLEMENTS: Record<Category, Category[]> = {
  Hoodies: ["Trousers", "Jackets"],
  Tracksuits: ["Shirts", "Jackets"],
  Jackets: ["Trousers", "Shirts", "Hoodies"],
  Trousers: ["Hoodies", "Shirts", "Jackets"],
  Shirts: ["Trousers", "Jackets"],
};

function Row({ title, products }: { title: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-16 md:mt-24" aria-label={title}>
      <h2 className="display-heading mb-8 text-4xl sm:text-5xl">{title}</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
        {products.map((p, i) => (
          <ProductCard key={p.slug} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

/**
 * - You may also like: other pieces from the same category.
 * - Complete the look: pieces from complementary categories, one category at a time.
 * - Recently viewed: pieces this visitor opened before (stored in their own browser).
 * The current product never appears in any row.
 */
export function RelatedProducts({ product }: { product: Product }) {
  const { data: products = [] } = useProducts();
  const recentSlugs = useRecentlyViewed(product.slug);

  const { similar, look, recent } = useMemo(() => {
    const others = products.filter((p) => p.slug !== product.slug);
    const similar = others.filter((p) => p.category === product.category).slice(0, 4);
    const pools = COMPLEMENTS[product.category].map((c) => others.filter((p) => p.category === c));
    const look: Product[] = [];
    for (let i = 0; look.length < 4 && pools.some((pool) => i < pool.length); i++)
      for (const pool of pools) if (pool[i] && look.length < 4) look.push(pool[i]!);
    const recent = recentSlugs
      .map((slug) => others.find((p) => p.slug === slug))
      .filter((p): p is Product => !!p)
      .slice(0, 4);
    return { similar, look, recent };
  }, [products, product, recentSlugs]);

  return (
    <div className="page-container pb-16">
      <Row title="You may also like" products={similar} />
      <Row title="Complete the look" products={look} />
      <Row title="Recently viewed" products={recent} />
    </div>
  );
}
