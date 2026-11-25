import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { RequireAuth } from "@/components/account/RequireAuth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { orderNumber, paymentLabel, STATUS_LABEL } from "@/lib/order-status";

interface HistoryOrder {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_cents: number;
  tracking_number: string | null;
  created_at: string;
  order_items: {
    id: string;
    product_name: string;
    size: string;
    color: string;
    quantity: number;
  }[];
}

export const Route = createFileRoute("/account/orders/")({
  head: () => ({
    meta: [{ title: "Order history — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth redirect="/account/orders">{(user) => <History userId={user.id} />}</RequireAuth>
  ),
});

function History({ userId }: { userId: string }) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select(
          "id, status, payment_method, payment_status, total_cents, tracking_number, created_at, order_items(id, product_name, size, color, quantity)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoryOrder[];
    },
  });
  return (
    <div>
      <Link
        to="/account"
        className="text-xs uppercase tracking-[0.16em] text-muted-foreground underline underline-offset-4"
      >
        ← Account
      </Link>
      <h1 className="display-heading mt-4 text-[clamp(2.75rem,10vw,5rem)]">Order history.</h1>
      {isLoading ? (
        <p className="mt-8" role="status">
          Loading…
        </p>
      ) : !orders?.length ? (
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">No orders yet.</p>
          <Link
            to="/shop"
            search={{ category: "All pieces" }}
            className="btn mt-6 bg-primary text-primary-foreground"
          >
            Explore collection
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border border-border p-5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base tabular-nums">
                  {orderNumber(o.id)}
                  <span className="ml-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  </span>
                </span>
                <span className="text-xs uppercase tracking-[0.16em]">
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <ul className="mt-3 space-y-0.5 text-muted-foreground">
                {o.order_items.map((i) => (
                  <li key={i.id}>
                    {i.product_name} · {i.size} · {i.color} × {i.quantity}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {paymentLabel(o)}
                  {o.tracking_number ? ` · Tracking ${o.tracking_number}` : ""}
                </span>
                <span className="tabular-nums">{formatPrice(o.total_cents)}</span>
              </div>
              <Link
                to="/account/orders/$id"
                params={{ id: o.id }}
                className="mt-3 inline-block py-2 text-xs uppercase tracking-[0.16em] underline underline-offset-4"
              >
                View order
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
