import { createFileRoute, Link } from "@tanstack/react-router";

import { CartLines } from "@/components/cart/CartDrawer";
import { FreeShippingProgress } from "@/components/cart/FreeShippingProgress";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ShippingNote } from "@/components/shop/ShippingNote";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your bag — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { count, subtotalCents } = useCart();
  return (
    <SiteLayout>
      <div className="page-container max-w-5xl py-10 md:py-14">
        <h1 className="display-heading text-[clamp(2.75rem,10vw,5.5rem)]">Your bag</h1>
        {count === 0 ? (
          <CartLines />
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="min-w-0">
              <FreeShippingProgress subtotalCents={subtotalCents} />
              <CartLines />
            </div>
            <aside className="h-fit min-w-0 space-y-4 border border-border p-6 lg:sticky lg:top-24">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.24em]">Summary</h2>
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
              </div>
              <ShippingNote className="text-xs leading-relaxed text-muted-foreground" />
              <Button asChild size="lg" className="h-14 w-full text-xs uppercase tracking-[0.22em]">
                <Link to="/checkout">Proceed to checkout</Link>
              </Button>
              <Link
                to="/shop"
                search={{ category: "All pieces" }}
                className="block py-2 text-center text-xs uppercase tracking-[0.16em] underline underline-offset-4"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
