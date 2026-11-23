import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Reveal } from "@/components/layout/Reveal";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { FadeImage } from "@/components/shop/FadeImage";
import { ProductCard } from "@/components/shop/ProductCard";
import heroImage from "@/assets/collection-campaign.jpg";
import { optimizeImageUrl } from "@/lib/image-tools";
import { useProducts } from "@/lib/products-api";
import { SITE_URL } from "@/lib/site-config";
import { CORE_CATEGORIES, type Product } from "@/types/store";

const TITLE = "NOWHERE | Premium Streetwear Pakistan";
const DESCRIPTION =
  "Discover NOWHERE — contemporary streetwear designed for individuality. Explore premium hoodies, tracksuits, shirts, jackets and everyday essentials.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Index,
});

function SectionHeading({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between md:mb-14">
        <div>
          <h2 className="display-heading text-[clamp(2.25rem,12vw,3rem)] sm:text-6xl lg:text-7xl">
            {title}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{copy}</p>
        </div>
        {action}
      </div>
    </Reveal>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} index={i} />
      ))}
    </div>
  );
}

const TEXT_LINK =
  "link-underline text-[11px] font-medium uppercase tracking-[0.22em] text-foreground";

function Index() {
  const { data: products = [] } = useProducts();

  const categoryImage = (category: string) => products.find((p) => p.category === category)?.image;

  // Real catalogue data only: bestsellers are products flagged as such; new arrivals are the latest by creation date.
  const mostWanted = products.filter((p) => p.badge && /best|featured/i.test(p.badge)).slice(0, 4);
  const justLanded = [...products]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return (
    <SiteLayout>
      {/* HERO */}
      <section
        aria-label="NOWHERE campaign"
        className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-[var(--nw-ink)] text-[var(--nw-paper)] h-[78svh] md:h-[85vh] md:max-h-[920px]"
      >
        <img
          src={heroImage}
          alt="Three models in NOWHERE outerwear, a hoodie and an oversized shirt against brutalist concrete architecture"
          width={1536}
          height={1024}
          fetchPriority="high"
          decoding="async"
          className="animate-settle absolute inset-0 -z-10 size-full object-cover object-[62%_center] md:object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10 md:bg-gradient-to-tr md:from-black/80 md:via-black/25 md:to-transparent"
        />
        <div className="page-container pb-10 md:pb-16">
          <p
            className="animate-rise eyebrow text-[var(--nw-stone)]"
            style={{ animationDelay: "100ms" }}
          >
            NOWHERE / Contemporary Streetwear
          </p>
          <h1
            className="animate-rise display-heading mt-5 text-[clamp(3rem,15vw,10.5rem)]"
            style={{ animationDelay: "220ms" }}
          >
            Not made
            <br />
            to fit in.
          </h1>
          <p
            className="animate-rise mt-5 max-w-sm text-sm leading-relaxed text-[var(--nw-stone)] sm:text-base"
            style={{ animationDelay: "340ms" }}
          >
            Streetwear for those who move differently.
          </p>
          <div
            className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "460ms" }}
          >
            <Link to="/shop" search={{ category: "All pieces" }} className="btn btn-primary">
              Shop collection
            </Link>
            <Link to="/" hash="about" className="btn btn-secondary">
              Explore NOWHERE
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="collections" className="page-container py-16 md:py-24">
        <SectionHeading
          title="Explore the collection"
          copy="Built around individuality. Designed for everyday expression."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {CORE_CATEGORIES.map((category, i) => {
            const src = categoryImage(category);
            const isLast = i === CORE_CATEGORIES.length - 1;
            return (
              <Reveal
                key={category}
                delay={i * 70}
                className={isLast ? "col-span-2 sm:col-span-1" : ""}
              >
                <Link
                  to="/shop"
                  search={{ category }}
                  className={`group relative block overflow-hidden bg-card ${isLast ? "aspect-[8/5] sm:aspect-[3/4]" : "aspect-[3/4]"}`}
                >
                  {src && (
                    <FadeImage
                      src={optimizeImageUrl(src, 640)}
                      alt={`${category} from the NOWHERE collection`}
                      width={640}
                      height={853}
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      loading="lazy"
                      decoding="async"
                      className="zoom-img absolute inset-0 size-full object-cover"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-[var(--nw-paper)] sm:p-5">
                    <h3 className="display-heading text-[clamp(1.25rem,6vw,1.875rem)] sm:text-4xl">
                      {category}
                    </h3>
                    <p className="eyebrow mt-2 flex items-center gap-2 text-[var(--nw-stone)]">
                      Explore
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* MOST WANTED */}
      {mostWanted.length > 0 && (
        <section className="page-container pb-16 md:pb-24">
          <SectionHeading
            title="Most wanted."
            copy="The pieces defining the NOWHERE collection."
            action={
              <Link to="/shop" search={{ category: "All pieces" }} className={TEXT_LINK}>
                View all
              </Link>
            }
          />
          <ProductGrid products={mostWanted} />
        </section>
      )}

      {/* BRAND STATEMENT */}
      <section
        id="about"
        aria-labelledby="brand-statement"
        className="border-y border-[var(--nw-line)] bg-[var(--nw-ink-2)] text-[var(--nw-paper)]"
      >
        <div className="page-container py-24 md:py-36">
          <Reveal>
            <p className="eyebrow text-[var(--nw-mute)]">About NOWHERE</p>
            <h2
              id="brand-statement"
              className="display-heading mt-6 text-[clamp(2.5rem,11vw,8.5rem)]"
            >
              We don&rsquo;t follow
              <br />
              the framework.
            </h2>
            <div className="mt-10 max-w-xl space-y-4 text-base leading-relaxed text-[var(--nw-stone)]">
              <p>
                We believe in individuality, expression, and the freedom to define your own
                identity.
              </p>
              <p>NOWHERE exists for those who move differently.</p>
            </div>
            <Link to="/shop" search={{ sort: "newest" }} className="btn btn-primary mt-10">
              Discover NOWHERE
            </Link>
          </Reveal>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      {justLanded.length > 0 && (
        <section className="page-container py-16 md:py-24">
          <SectionHeading
            title="Just landed."
            copy="The latest pieces to join the collection."
            action={
              <Link to="/shop" search={{ sort: "newest" }} className={TEXT_LINK}>
                Shop new arrivals
              </Link>
            }
          />
          <ProductGrid products={justLanded} />
        </section>
      )}
    </SiteLayout>
  );
}
