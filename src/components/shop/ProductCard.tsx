import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { Reveal } from "@/components/layout/Reveal";
import { FadeImage } from "@/components/shop/FadeImage";
import { useWishlist } from "@/hooks/use-wishlist";

import { optimizeImageUrl } from "@/lib/image-tools";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/store";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.slug);
  return (
    <Reveal delay={(index % 4) * 90}>
      <div className="relative">
        <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <FadeImage
              src={optimizeImageUrl(product.image, 700)}
              alt={product.name}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
            {product.alternateImage && (
              <img
                src={optimizeImageUrl(product.alternateImage, 700)}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
              />
            )}
            {product.badge && (
              <span className="absolute left-3 top-3 bg-background px-2 py-1 text-[10px] uppercase tracking-widest">
                {product.badge}
              </span>
            )}
            {product.stock === 0 && (
              <span className="absolute bottom-3 left-3 bg-primary px-2 py-1 text-[10px] uppercase tracking-widest text-primary-foreground">
                Sold out
              </span>
            )}
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-muted-foreground">{product.category}</p>
            </div>
            <p>{formatPrice(product.priceCents)}</p>
          </div>
        </Link>
        <button
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={saved}
          onClick={() => toggle(product.slug)}
          className="absolute right-3 top-3 rounded-full bg-background/90 p-2"
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
