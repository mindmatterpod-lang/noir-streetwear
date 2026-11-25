import { Link } from "@tanstack/react-router";

import { PurchasePanel } from "@/components/shop/PurchasePanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import { optimizeImageUrl } from "@/lib/image-tools";
import type { Product } from "@/types/store";

/** Quick View: the same PurchasePanel as the product page, in a dialog. */
export default function QuickView({
  product,
  open,
  onOpenChange,
  onAdded,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] w-full max-w-3xl content-start gap-0 overflow-y-auto rounded-none p-0 sm:max-h-[90vh] sm:rounded-none">
        <div className="grid sm:grid-cols-2">
          <img
            src={optimizeImageUrl(product.image, 700)}
            alt={product.name}
            width={700}
            height={875}
            className="aspect-[4/5] w-full bg-card object-cover"
          />
          <div className="p-6">
            <DialogHeader className="pr-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {product.category}
              </p>
              <DialogTitle className="display-heading text-4xl">{product.name}</DialogTitle>
              <DialogDescription className="text-base tabular-nums text-foreground">
                {formatPrice(product.priceCents)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6">
              <PurchasePanel
                product={product}
                onAdded={() => {
                  onAdded?.();
                  onOpenChange(false);
                }}
              />
            </div>
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              onClick={() => onOpenChange(false)}
              className="mt-4 inline-block py-2 text-xs uppercase tracking-[0.18em] underline underline-offset-4"
            >
              View full details
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
