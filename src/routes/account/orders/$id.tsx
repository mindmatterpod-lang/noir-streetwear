import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { RequireAuth } from "@/components/account/RequireAuth";
import { OrderView, type OrderViewData } from "@/components/order/OrderView";
import { db } from "@/lib/db";

export const Route = createFileRoute("/account/orders/$id")({
  head: () => ({
    meta: [{ title: "Your order — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  return (
    <RequireAuth redirect={`/account/orders/${id}`}>
      {(user) => <Detail id={id} userId={user.id} />}
    </RequireAuth>
  );
}

function Detail({ id, userId }: { id: string; userId: string }) {
  // Row-level security only ever returns this customer's own orders, so a guessed id returns nothing.
  const { data: order, isLoading } = useQuery({
    queryKey: ["my-order", userId, id],
    queryFn: async (): Promise<OrderViewData | null> => {
      const { data, error } = await db
        .from("orders")
        .select(
          "id, status, payment_method, payment_status, tracking_number, created_at, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, order_items(product_name, size, color, quantity, unit_price_cents)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { order_items, ...rest } = data as Omit<OrderViewData, "items"> & {
        order_items: {
          product_name: string;
          size: string;
          color: string;
          quantity: number;
          unit_price_cents: number;
        }[];
      };
      return {
        ...rest,
        items: order_items.map((i) => ({
          name: i.product_name,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unit_price_cents: i.unit_price_cents,
        })),
      };
    },
  });
  return (
    <div>
      <Link
        to="/account/orders"
        className="text-xs uppercase tracking-[0.16em] text-muted-foreground underline underline-offset-4"
      >
        ← Order history
      </Link>
      <h1 className="display-heading mb-8 mt-4 text-[clamp(2.75rem,10vw,5rem)]">Your order.</h1>
      {isLoading ? (
        <p role="status">Loading…</p>
      ) : !order ? (
        <p className="text-sm text-muted-foreground">
          We couldn&rsquo;t find that order on your account.
        </p>
      ) : (
        <OrderView order={order} />
      )}
    </div>
  );
}
