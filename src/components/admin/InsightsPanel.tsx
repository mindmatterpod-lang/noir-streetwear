import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { computeInsights, type InsightItem, type InsightOrder } from "@/lib/insights";

const DAYS = 90;

export function InsightsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-insights"],
    queryFn: async () => {
      const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
      const { data: orders, error } = await db
        .from("orders")
        .select(
          "id, status, total_cents, created_at, shipping_email, payment_method, payment_status",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const ids = (orders ?? []).map((o: { id: string }) => o.id);
      const { data: items, error: itemError } = ids.length
        ? await db
            .from("order_items")
            .select("order_id, product_name, quantity, unit_price_cents")
            .in("order_id", ids)
        : { data: [], error: null };
      if (itemError) throw itemError;
      return computeInsights((orders ?? []) as InsightOrder[], (items ?? []) as InsightItem[]);
    },
  });
  if (isLoading) return <p role="status">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Could not load insights.</p>;
  const stat = (label: string, value: string) => (
    <div className="border border-border p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl tabular-nums">{value}</p>
    </div>
  );
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Last {DAYS} days, from real orders. A sale is a non-cancelled order that is cash on delivery
        or paid by card.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {stat("Orders", String(data.orders))}
        {stat("Revenue", formatPrice(data.revenueCents))}
        {stat("Average order", formatPrice(data.averageOrderCents))}
        {stat("Cancelled", String(data.cancelled))}
        {stat("New customers", String(data.newCustomers))}
        {stat("Returning customers", String(data.returningCustomers))}
      </div>
      <section>
        <h3 className="text-sm font-medium uppercase tracking-[0.16em]">Best sellers</h3>
        {data.bestSellers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No sales in this period.</p>
        ) : (
          <ol className="mt-3 divide-y divide-border border border-border text-sm">
            {data.bestSellers.map((p) => (
              <li key={p.name} className="flex justify-between p-3">
                <span>{p.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {p.units} sold · {formatPrice(p.revenueCents)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        Conversion rate and cart abandonment are not shown: they need visitor and cart data that
        this store does not record yet. Returning customers are matched by email within this period
        only.
      </p>
    </div>
  );
}
