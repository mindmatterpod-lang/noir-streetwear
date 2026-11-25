/** The order statuses the backend actually uses (see the orders table check constraint). */
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export const STATUS_LABEL: Record<string, string> = {
  pending: "Order placed",
  processing: "Processing",
  shipped: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const FLOW: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];

export interface TimelineStep {
  key: OrderStatus;
  label: string;
  state: "done" | "current" | "upcoming";
}

/** Timeline derived only from the real status. A cancelled order has no forward timeline. */
export function buildTimeline(status: string): { steps: TimelineStep[]; cancelled: boolean } {
  if (status === "cancelled") return { steps: [], cancelled: true };
  const at = Math.max(0, FLOW.indexOf(status as OrderStatus));
  return {
    cancelled: false,
    steps: FLOW.map((key, i) => ({
      key,
      label: STATUS_LABEL[key] ?? key,
      state:
        i < at || (status === "delivered" && i === at) ? "done" : i === at ? "current" : "upcoming",
    })),
  };
}

export const orderNumber = (id: string) => `#${id.slice(0, 8)}`;

/** Customer-facing payment description from the real payment fields. */
export const paymentLabel = (o: { payment_method: string; payment_status: string }) =>
  o.payment_method === "cod"
    ? "Cash on delivery"
    : o.payment_status === "paid"
      ? "Paid by card"
      : o.payment_status === "refunded"
        ? "Refunded"
        : "Awaiting payment";
