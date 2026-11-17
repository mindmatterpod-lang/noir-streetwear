import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { useCart } from "@/hooks/use-cart";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

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
    meta: [{ title: "Your order — Noir Streetwear" }, { name: "robots", content: "noindex" }],
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

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <p>Loading…</p>
        ) : !order ? (
          <div className="py-16 text-center">
            <p>We couldn't find that order. Check the link in your confirmation email.</p>
            <Link to="/" className="mt-4 inline-block underline">
              Home
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black uppercase tracking-widest">
              Thank you, {order.shipping_name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 border border-border p-4 text-sm">
              <span>
                Status: <strong className="uppercase">{order.status}</strong>
              </span>
              <span>
                Payment:{" "}
                <strong>
                  {order.payment_method === "cod"
                    ? "Cash on delivery"
                    : order.payment_status === "paid"
                      ? "Paid"
                      : "Awaiting payment"}
                </strong>
              </span>
              {order.tracking_number && (
                <span>
                  Tracking: <strong>{order.tracking_number}</strong>
                </span>
              )}
            </div>
            <ul className="mt-6 divide-y divide-border text-sm">
              {order.items.map((i, n) => (
                <li key={n} className="flex justify-between py-2">
                  <span>
                    {i.name} · {i.size} · {i.color} × {i.quantity}
                  </span>
                  <span>{formatPrice(i.unit_price_cents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal_cents)}</dd>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between">
                  <dt>Discount</dt>
                  <dd>−{formatPrice(order.discount_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd>{order.shipping_cents ? formatPrice(order.shipping_cents) : "Free"}</dd>
              </div>
              {order.tax_cents > 0 && (
                <div className="flex justify-between">
                  <dt>Tax</dt>
                  <dd>{formatPrice(order.tax_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd>{formatPrice(order.total_cents)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
