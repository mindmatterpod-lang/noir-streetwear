import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { Reveal } from "@/components/layout/Reveal";
import { FadeImage } from "@/components/shop/FadeImage";
import { useWishlist } from "@/hooks/use-wishlist";

import { optimizeImageUrl } from "@/lib/image-tools";
import { formatPrice } from "@/lib/format";
import { COLOR_NAMES, COLOR_SWATCH, type Product } from "@/types/store";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.slug);
  return (
    <Reveal delay={(index % 4) * 90}>
      <div className="relative">
        <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
          <div className="relative aspect-[4/5] overflow-hidden bg-card">
            <FadeImage
              src={optimizeImageUrl(product.image, 700)}
              alt={product.name}
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
            {product.badge && (
              <span className="absolute left-3 top-3 bg-background px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em]">
                {product.badge}
              </span>
            )}
            {product.stock === 0 && (
              <span className="absolute bottom-3 left-3 bg-primary px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-primary-foreground">
                Sold out
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
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
        <button
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
    </Reveal>
  );
}
