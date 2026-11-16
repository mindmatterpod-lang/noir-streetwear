import { createFileRoute, Link } from "@tanstack/react-router";

import { CartLines } from "@/components/cart/CartDrawer";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your bag — Noir Streetwear" }, { name: "robots", content: "noindex" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { count, subtotalCents } = useCart();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black uppercase tracking-widest">Bag</h1>
        <CartLines />
        {count > 0 ? (
          <div className="mt-6 space-y-3 border-t border-border pt-6">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Shipping: free</p>
            <Button asChild size="lg" className="w-full">
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
          </div>
        ) : (
          <Button asChild className="mt-4">
            <Link to="/shop" search={{ category: "All pieces" }}>
              Continue shopping
            </Link>
          </Button>
        )}
      </div>
    </SiteLayout>
  );
}
