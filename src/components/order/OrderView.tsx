import { OrderTimeline } from "@/components/order/OrderTimeline";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import { formatPrice } from "@/lib/format";
import { orderNumber, paymentLabel, STATUS_LABEL } from "@/lib/order-status";
import { supportMessages } from "@/lib/contact";

export interface OrderViewData {
  id: string;
  created_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  tracking_number: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  items: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price_cents: number;
  }[];
}

/** Order number, status, timeline, tracking, items and totals, shared by the guest order page and the account. */
export function OrderView({ order }: { order: OrderViewData }) {
  const label = "text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground";
  return (
    <div>
      <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-3">
        <div>
          <p className={label}>Order number</p>
          <p className="mt-2 text-lg tabular-nums">{orderNumber(order.id)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
          </p>
        </div>
        <div>
          <p className={label}>Current status</p>
          <p className="mt-2 text-lg uppercase tracking-[0.08em]">
            {STATUS_LABEL[order.status] ?? order.status}
          </p>
        </div>
        <div>
          <p className={label}>Payment</p>
          <p className="mt-2 text-lg">{paymentLabel(order)}</p>
        </div>
      </div>

      <section aria-labelledby="timeline-heading" className="mt-10">
        <h2 id="timeline-heading" className={`${label} mb-6`}>
          Order timeline
        </h2>
        <OrderTimeline status={order.status} />
        <div className="mt-6 text-sm">
          {order.tracking_number ? (
            <p>
              <span className="text-muted-foreground">Tracking number: </span>
              <strong className="tabular-nums">{order.tracking_number}</strong>
            </p>
          ) : (
            order.status !== "cancelled" && (
              <p className="text-muted-foreground">No tracking number has been added yet.</p>
            )
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            This page shows your order&rsquo;s status in our store. It is not a live courier feed.
          </p>
        </div>
      </section>

      <section aria-labelledby="items-heading" className="mt-10">
        <h2 id="items-heading" className={`${label} mb-2`}>
          Items
        </h2>
        <ul className="divide-y divide-border text-sm">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-3">
              <span>
                {i.name}
                <span className="block text-xs text-muted-foreground">
                  {i.size} · {i.color} × {i.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatPrice(i.unit_price_cents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal_cents)}</dd>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{formatPrice(order.discount_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="tabular-nums">
              {order.shipping_cents ? formatPrice(order.shipping_cents) : "Free"}
            </dd>
          </div>
          {order.tax_cents > 0 && (
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd className="tabular-nums">{formatPrice(order.tax_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total_cents)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-10">
        <WhatsAppButton
          message={supportMessages.order(orderNumber(order.id))}
          label="Need help with this order?"
        />
      </div>
    </div>
  );
}
