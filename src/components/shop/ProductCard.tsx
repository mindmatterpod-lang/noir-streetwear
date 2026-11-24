import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Reveal } from "@/components/layout/Reveal";
import { FadeImage } from "@/components/shop/FadeImage";
import { useWishlist } from "@/hooks/use-wishlist";

import { optimizeImageUrl } from "@/lib/image-tools";
import { formatPrice } from "@/lib/format";
import { COLOR_NAMES, COLOR_SWATCH, type Product } from "@/types/store";

// Quick View only downloads when someone opens it.
const QuickView = lazy(() => import("@/components/shop/QuickView"));

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.slug);
  const [quickOpen, setQuickOpen] = useState(false);
  const soldOut = product.stock <= 0;
  return (
    <Reveal delay={(index % 4) * 90}>
      <div className="group relative">
        <div className="relative aspect-[4/5] overflow-hidden bg-card">
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0"
          >
            <FadeImage
              src={optimizeImageUrl(product.image, 700)}
              alt=""
              width={700}
              height={875}
              sizes="(min-width: 1024px) 25vw, 50vw"
              loading="lazy"
              decoding="async"
              className="zoom-img size-full object-cover"
            />
            {product.alternateImage && (
              <img
                src={optimizeImageUrl(product.alternateImage, 700)}
                alt=""
                width={700}
                height={875}
                sizes="(min-width: 1024px) 25vw, 50vw"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </Link>
          {product.badge && (
            <span className="pointer-events-none absolute left-3 top-3 bg-background px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em]">
              {product.badge}
            </span>
          )}
          {soldOut && (
            <span className="pointer-events-none absolute bottom-3 left-3 bg-primary px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-foreground">
              Sold out
            </span>
          )}
          {!soldOut && (
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Quick view: ${product.name}`}
              className="absolute inset-x-3 bottom-3 hidden min-h-11 items-center justify-center bg-background/95 text-[11px] font-medium uppercase tracking-[0.2em] opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:flex"
            >
              Quick view
            </button>
          )}
          <button
            type="button"
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={saved}
            onClick={() => toggle(product.slug)}
            className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-background/90"
          >
            <Heart
              key={String(saved)}
              className={`size-4 ${saved ? "fill-current animate-pop" : ""}`}
            />
          </button>
        </div>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="mt-4 block">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <p className="min-w-0 text-[13px] font-medium uppercase leading-snug tracking-[0.08em]">
              {product.name}
            </p>
            <p className="shrink-0 text-[13px] tabular-nums">{formatPrice(product.priceCents)}</p>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{product.category}</p>
            {product.colors.length > 0 && (
              <ul className="flex items-center gap-1.5" aria-label="Available colours">
                {product.colors.map((color) => (
                  <li
                    key={color}
                    title={COLOR_NAMES[color]}
                    className="size-3 rounded-full border border-foreground/25"
                    style={{ backgroundColor: COLOR_SWATCH[color] }}
                  >
                    <span className="sr-only">{COLOR_NAMES[color]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Link>
        {quickOpen && (
          <Suspense fallback={null}>
            <QuickView product={product} open={quickOpen} onOpenChange={setQuickOpen} />
          </Suspense>
        )}
      </div>
    </Reveal>
  );
}
