import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { useCartDrawer } from "@/hooks/use-cart-drawer";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES } from "@/types/store";

export function CartLines() {
  const { items, setQuantity, removeItem } = useCart();
  if (items.length === 0)
    return <p className="py-10 text-center text-sm text-muted-foreground">Your bag is empty.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const product = getProduct(item.productId);
        if (!product) return null;
        return (
          <li key={`${item.productId}${item.size}${item.color}`} className="flex gap-4 py-4">
            <img src={product.image} alt={product.name} className="h-24 w-20 object-cover" />
            <div className="flex flex-1 flex-col text-sm">
              <div className="flex justify-between gap-2">
                <Link to="/product/$slug" params={{ slug: product.slug }} className="font-medium">
                  {product.name}
                </Link>
                <button
                  aria-label={`Remove ${product.name}`}
                  onClick={() => removeItem(item.productId, item.size, item.color)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <span className="text-muted-foreground">
                {item.size} · {COLOR_NAMES[item.color]}
              </span>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 border border-border px-2 py-1">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() =>
                      setQuantity(item.productId, item.size, item.color, item.quantity - 1)
                    }
                  >
                    <Minus className="size-3" />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() =>
                      setQuantity(item.productId, item.size, item.color, item.quantity + 1)
                    }
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <span>{formatPrice(product.priceCents * item.quantity)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartDrawer() {
  const { isOpen, setOpen } = useCartDrawer();
  const { subtotalCents, count } = useCart();
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col px-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="uppercase tracking-widest">Bag ({count})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <CartLines />
        </div>
        {count > 0 && (
          <div className="space-y-3 border-t border-border pb-4 pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Free shipping on every order.</p>
            <Button asChild className="w-full" onClick={() => setOpen(false)}>
              <Link to="/checkout">Checkout</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
              <Link to="/cart">View bag</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
