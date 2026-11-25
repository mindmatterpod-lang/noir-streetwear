export interface InsightOrder {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  shipping_email: string;
  payment_method: string;
  payment_status: string;
}
export interface InsightItem {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
}

/** An order counts as a sale when it is not cancelled and is either cash on delivery or already paid by card. */
export const isSale = (o: InsightOrder) =>
  o.status !== "cancelled" && (o.payment_method === "cod" || o.payment_status === "paid");

/** Metrics calculated only from the orders passed in. Nothing here is estimated. */
export function computeInsights(orders: InsightOrder[], items: InsightItem[]) {
  const sales = orders.filter(isSale);
  const saleIds = new Set(sales.map((o) => o.id));
  const revenueCents = sales.reduce((sum, o) => sum + o.total_cents, 0);

  const byProduct = new Map<string, { units: number; revenueCents: number }>();
  for (const item of items) {
    if (!saleIds.has(item.order_id)) continue;
    const row = byProduct.get(item.product_name) ?? { units: 0, revenueCents: 0 };
    row.units += item.quantity;
    row.revenueCents += item.quantity * item.unit_price_cents;
    byProduct.set(item.product_name, row);
  }

  const perCustomer = new Map<string, number>();
  for (const o of sales) {
    const email = o.shipping_email.trim().toLowerCase();
    perCustomer.set(email, (perCustomer.get(email) ?? 0) + 1);
  }
  const returningCustomers = [...perCustomer.values()].filter((n) => n >= 2).length;

  return {
    orders: sales.length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    revenueCents,
    averageOrderCents: sales.length ? Math.round(revenueCents / sales.length) : 0,
    bestSellers: [...byProduct.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents)
      .slice(0, 5),
    customers: perCustomer.size,
    returningCustomers,
    newCustomers: perCustomer.size - returningCustomers,
  };
}
