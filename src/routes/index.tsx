import { createFileRoute, Link } from "@tanstack/react-router";

import { Reveal } from "@/components/layout/Reveal";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/collection-campaign.jpg";
import { useProducts } from "@/lib/products-api";
import { CORE_CATEGORIES } from "@/types/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nowhere — Hoodies, Tracksuits, Jackets, Trousers & Shirts" },
      {
        name: "description",
        content: "Modern streetwear in five core categories. Cash on delivery across Pakistan.",
      },
      { property: "og:title", content: "Nowhere" },
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
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Nowhere collection campaign"
          className="animate-settle h-[70vh] w-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-start justify-end bg-gradient-to-t from-black/70 to-transparent p-6 text-white sm:p-12">
          <p
            className="animate-rise text-xs uppercase tracking-[0.4em]"
            style={{ animationDelay: "150ms" }}
          >
            New season
          </p>
          <h1
            className="animate-rise mt-2 max-w-xl text-4xl font-black uppercase leading-none sm:text-6xl"
            style={{ animationDelay: "300ms" }}
          >
            Dark by design
          </h1>
          <Button
            asChild
            variant="secondary"
            className="animate-rise mt-6"
            style={{ animationDelay: "480ms" }}
          >
            <Link to="/shop" search={{ category: "All pieces" }}>
              Shop the collection
            </Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
          <h2 className="mb-6 text-sm uppercase tracking-widest">Shop by category</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {CORE_CATEGORIES.map((category, i) => (
            <Reveal key={category} delay={i * 80}>
              <Link
                to="/shop"
                search={{ category }}
                className="group flex h-28 items-center justify-center border border-border text-sm uppercase tracking-widest transition hover:bg-primary hover:text-primary-foreground"
              >
                {category}
                <span
                  aria-hidden="true"
                  className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Reveal>
          <h2 className="mb-6 text-sm uppercase tracking-widest">Featured</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {featured.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
