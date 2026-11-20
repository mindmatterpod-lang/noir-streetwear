import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/collection-campaign.jpg";
import { useProducts } from "@/lib/products-api";
import { CORE_CATEGORIES } from "@/types/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Noir Streetwear — Hoodies, Tracksuits, Jackets, Trousers & Shirts" },
      {
        name: "description",
        content: "Modern streetwear in five core categories. Cash on delivery across Pakistan.",
      },
      { property: "og:title", content: "Noir Streetwear" },
      { property: "og:description", content: "Modern streetwear in five core categories." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products = [] } = useProducts();
  const featured = products.filter((p) => p.badge).slice(0, 4);
  return (
    <SiteLayout>
      <section className="relative">
        <img
          src={heroImage}
          alt="Noir collection campaign"
          className="h-[70vh] w-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-start justify-end bg-gradient-to-t from-black/70 to-transparent p-6 text-white sm:p-12">
          <p className="text-xs uppercase tracking-[0.4em]">New season</p>
          <h1 className="mt-2 max-w-xl text-4xl font-black uppercase leading-none sm:text-6xl">
            Dark by design
          </h1>
          <Button asChild variant="secondary" className="mt-6">
            <Link to="/shop" search={{ category: "All pieces" }}>
              Shop the collection
            </Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-sm uppercase tracking-widest">Shop by category</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {CORE_CATEGORIES.map((category) => (
            <Link
              key={category}
              to="/shop"
              search={{ category }}
              className="flex h-28 items-center justify-center border border-border text-sm uppercase tracking-widest transition hover:bg-primary hover:text-primary-foreground"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-sm uppercase tracking-widest">Featured</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
