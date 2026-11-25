import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { OrderView } from "@/components/order/OrderView";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { trackPurchaseOnce } from "@/lib/analytics";
import { useCart } from "@/hooks/use-cart";
import { db } from "@/lib/db";

interface PublicOrder {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  tracking_number: string | null;
  created_at: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  shipping_name: string;
  items: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price_cents: number;
  }[];
}

export const Route = createFileRoute("/order/$id")({
  validateSearch: (s: Record<string, unknown>): { token?: string; paid?: string } => ({
    ...(typeof s["token"] === "string" ? { token: s["token"] } : {}),
    ...(s["paid"] === "1" || s["paid"] === 1 ? { paid: "1" } : {}),
  }),
  head: () => ({
    meta: [{ title: "Your order — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { token, paid } = Route.useSearch();
  const { clearCart } = useCart();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id, token],
    enabled: !!token,
    refetchInterval: paid ? 4000 : false,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_order_public", { p_order: id, p_token: token });
      if (error) throw error;
      return data as PublicOrder | null;
    },
  });
  // The bag is only emptied once the customer is back from a successful card payment.
  useEffect(() => {
    if (paid) clearCart();
  }, [paid, clearCart]);

  const placed = !!order && (order.payment_method === "cod" || order.payment_status === "paid");
  useEffect(() => {
    if (order && placed)
      trackPurchaseOnce(order.id, order.total_cents, order.items.length, order.created_at);
  }, [order, placed]);

  return (
    <SiteLayout>
      <div className="page-container max-w-3xl py-10 md:py-14">
        {isLoading ? (
          <p role="status">Loading…</p>
        ) : !order ? (
          <div className="py-16">
            <h1 className="display-heading text-5xl">Order not found.</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              We couldn&rsquo;t find that order. Use the link in your confirmation email, or track
              it with your order number and email.
            </p>
            <Link
              to="/track"
              className="mt-6 inline-block text-xs uppercase tracking-[0.16em] underline underline-offset-4"
            >
              Track an order
            </Link>
          </div>
        ) : (
          <>
            <h1 className="display-heading mb-8 text-[clamp(2.75rem,10vw,5rem)]">
              Thank you, {order.shipping_name.split(" ")[0]}.
            </h1>
            <OrderView order={order} />
          </>
        )}
      </div>
    </SiteLayout>
  );
}
