import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";

import { EmptyBag } from "@/components/cart/EmptyBag";
import { FreeShippingProgress } from "@/components/cart/FreeShippingProgress";
import { ShippingNote } from "@/components/shop/ShippingNote";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { useCartDrawer } from "@/hooks/use-cart-drawer";
import { events } from "@/lib/analytics";
import { optimizeImageUrl } from "@/lib/image-tools";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES } from "@/types/store";

const MAX_PER_ORDER = 5;

export function CartLines({ onNavigate }: { onNavigate?: () => void }) {
  const { items, setQuantity, removeItem } = useCart();
  if (items.length === 0) return <EmptyBag {...(onNavigate ? { onNavigate } : {})} />;
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const product = getProduct(item.productId);
        if (!product) return null;
        const cap = Math.max(0, Math.min(product.stock, MAX_PER_ORDER));
        const tooMany = item.quantity > product.stock;
        return (
          <li key={`${item.productId}${item.size}${item.color}`} className="flex gap-4 py-5">
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              {...(onNavigate ? { onClick: onNavigate } : {})}
              className="shrink-0"
              tabIndex={-1}
              aria-hidden="true"
            >
              <img
                src={optimizeImageUrl(product.image, 200)}
                alt=""
                width={96}
                height={120}
                loading="lazy"
                className="h-[120px] w-24 bg-card object-cover"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col text-sm">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                  className="text-[13px] font-medium uppercase leading-snug tracking-[0.08em]"
                >
                  {product.name}
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${product.name}, size ${item.size}, ${COLOR_NAMES[item.color]}`}
                  onClick={() => {
                    events.removeFromCart(product.slug, item.quantity);
                    removeItem(item.productId, item.size, item.color);
                  }}
                  className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center"
                >
                  <X className="size-4" />
                </button>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                Size {item.size} · {COLOR_NAMES[item.color]}
              </span>
              <span className="mt-1 text-xs tabular-nums text-muted-foreground">
                {formatPrice(product.priceCents)} each
              </span>
              {tooMany && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {product.stock <= 0
                    ? "No longer available. Please remove it to check out."
                    : `Only ${product.stock} available. Please reduce the quantity.`}
                </p>
              )}
              <div className="mt-auto flex items-end justify-between pt-3">
                <div
                  role="group"
                  aria-label="Quantity"
                  className="flex items-center border border-border"
                >
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() =>
                      setQuantity(item.productId, item.size, item.color, item.quantity - 1)
                    }
                    className="flex size-11 items-center justify-center"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-7 text-center tabular-nums" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${product.name}`}
                    disabled={item.quantity >= cap}
                    onClick={() =>
                      setQuantity(item.productId, item.size, item.color, item.quantity + 1)
                    }
                    className="flex size-11 items-center justify-center disabled:opacity-30"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <span className="tabular-nums">
                  {formatPrice(product.priceCents * item.quantity)}
                </span>
              </div>
              {item.quantity >= cap && cap > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {cap < MAX_PER_ORDER
                    ? `Only ${cap} available.`
                    : `Maximum ${MAX_PER_ORDER} per order.`}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartDrawer() {
  const { isOpen, setOpen, addedMessage } = useCartDrawer();
  const { subtotalCents, count } = useCart();
  const close = () => setOpen(false);
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[state=closed]:duration-300 data-[state=open]:duration-300 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pr-14 text-left">
          <SheetTitle className="display-heading text-3xl">Bag ({count})</SheetTitle>
          <SheetDescription className="sr-only">
            The pieces in your bag, with quantities and your subtotal.
          </SheetDescription>
          {addedMessage && (
            <p
              role="status"
              className="mt-2 flex items-center gap-2 border border-border bg-secondary px-3 py-2 text-xs"
            >
              <span aria-hidden="true">✓</span> {addedMessage}
            </p>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5">
          {count > 0 && (
            <div className="pt-5">
              <FreeShippingProgress subtotalCents={subtotalCents} />
            </div>
          )}
          <CartLines onNavigate={close} />
        </div>
        {count > 0 && (
          <div className="space-y-3 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
            </div>
            <ShippingNote className="text-xs text-muted-foreground" />
            <Button
              asChild
              size="lg"
              className="h-14 w-full text-xs uppercase tracking-[0.22em]"
              onClick={close}
            >
              <Link to="/checkout">Checkout</Link>
            </Button>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em]">
              <button
                type="button"
                onClick={close}
                className="min-h-11 underline underline-offset-4"
              >
                Continue shopping
              </button>
              <Link
                to="/cart"
                onClick={close}
                className="flex min-h-11 items-center underline underline-offset-4"
              >
                View bag
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
