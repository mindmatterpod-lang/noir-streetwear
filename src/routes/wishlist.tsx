import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useWishlist } from "@/hooks/use-wishlist";
import { useProducts } from "@/lib/products-api";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [{ title: "Wishlist — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { slugs } = useWishlist();
  const { data: products = [] } = useProducts();
  const saved = products.filter((p) => slugs.includes(p.slug));
  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black uppercase tracking-widest">Wishlist</h1>
        {saved.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Nothing saved yet.{" "}
            <Link to="/shop" search={{}} className="underline">
              Browse the shop
            </Link>
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {saved.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
