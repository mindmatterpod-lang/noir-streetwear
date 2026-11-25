import { describe, expect, it } from "vitest";

import { computeInsights, type InsightItem, type InsightOrder } from "@/lib/insights";

const o = (id: string, over: Partial<InsightOrder> = {}): InsightOrder => ({
  id,
  status: "delivered",
  total_cents: 100000,
  created_at: "2026-11-01T00:00:00Z",
  shipping_email: `${id}@x.co`,
  payment_method: "cod",
  payment_status: "unpaid",
  ...over,
});

describe("computeInsights", () => {
  it("returns zeros for no orders instead of NaN", () => {
    expect(computeInsights([], [])).toMatchObject({
      orders: 0,
      revenueCents: 0,
      averageOrderCents: 0,
      customers: 0,
    });
  });
  it("counts COD and paid card orders, excludes cancelled and unpaid card orders", () => {
    const orders = [
      o("a"),
      o("b", { payment_method: "card", payment_status: "paid", total_cents: 300000 }),
      o("c", { status: "cancelled" }),
      o("d", { payment_method: "card", payment_status: "unpaid" }),
    ];
    const r = computeInsights(orders, []);
    expect(r.orders).toBe(2);
    expect(r.cancelled).toBe(1);
    expect(r.revenueCents).toBe(400000);
    expect(r.averageOrderCents).toBe(200000);
  });
  it("ranks best sellers by units from counted orders only", () => {
    const orders = [o("a"), o("b"), o("c", { status: "cancelled" })];
    const items: InsightItem[] = [
      { order_id: "a", product_name: "Hoodie", quantity: 2, unit_price_cents: 500000 },
      { order_id: "b", product_name: "Shirt", quantity: 1, unit_price_cents: 400000 },
      { order_id: "b", product_name: "Hoodie", quantity: 1, unit_price_cents: 500000 },
      { order_id: "c", product_name: "Shirt", quantity: 9, unit_price_cents: 400000 },
    ];
    expect(computeInsights(orders, items).bestSellers).toEqual([
      { name: "Hoodie", units: 3, revenueCents: 1500000 },
      { name: "Shirt", units: 1, revenueCents: 400000 },
    ]);
  });
  it("splits new and returning customers by email, ignoring case", () => {
    const orders = [
      o("a", { shipping_email: "Ali@x.co" }),
      o("b", { shipping_email: "ali@x.co" }),
      o("c", { shipping_email: "sara@x.co" }),
    ];
    const r = computeInsights(orders, []);
    expect(r).toMatchObject({ customers: 2, returningCustomers: 1, newCustomers: 1 });
  });
});
