import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site-config";

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export interface EmailOrder {
  id: string;
  guest_token: string;
  shipping_name: string;
  shipping_email: string;
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

export type OrderEmailKind = "confirmation" | "processing" | "shipped" | "delivered" | "cancelled";

const SUBJECTS: Record<OrderEmailKind, string> = {
  confirmation: "We received your order",
  processing: "We're preparing your order",
  shipped: "Your order is on its way",
  delivered: "Your order was delivered",
  cancelled: "Your order was cancelled",
};
const INTRO: Record<OrderEmailKind, string> = {
  confirmation: "Thanks for your order. Here is a summary.",
  processing: "Good news: we've started preparing your order.",
  shipped: "Your order has shipped.",
  delivered: "Your order has been delivered. We hope you love it.",
  cancelled: "Your order has been cancelled. If you paid by card, any charge will be refunded.",
};

export function renderOrderEmail(order: EmailOrder, kind: OrderEmailKind, origin: string) {
  const link = `${origin}/order/${order.id}?token=${order.guest_token}`;
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${esc(i.name)} · ${esc(i.size)} · ${esc(i.color)} × ${i.quantity}</td><td align="right">${money(i.unit_price_cents * i.quantity)}</td></tr>`,
    )
    .join("");
  const tracking =
    kind === "shipped" && order.tracking_number
      ? `<p><strong>Tracking number:</strong> ${esc(order.tracking_number)}</p>`
      : "";
  const pay =
    order.payment_method === "cod"
      ? "Cash on delivery"
      : order.payment_status === "paid"
        ? "Paid by card"
        : "Card payment pending";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
<h1 style="letter-spacing:4px">NOIR</h1><h2>${esc(SUBJECTS[kind])}</h2><p>Hi ${esc(order.shipping_name)},</p><p>${esc(INTRO[kind])}</p>${tracking}
<table width="100%" style="border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:8px;border-top:1px solid #ddd">Subtotal</td><td align="right" style="border-top:1px solid #ddd">${money(order.subtotal_cents)}</td></tr>
${order.discount_cents ? `<tr><td>Discount</td><td align="right">−${money(order.discount_cents)}</td></tr>` : ""}
<tr><td>Shipping</td><td align="right">${order.shipping_cents ? money(order.shipping_cents) : "Free"}</td></tr>
${order.tax_cents ? `<tr><td>Tax</td><td align="right">${money(order.tax_cents)}</td></tr>` : ""}
<tr><td><strong>Total</strong></td><td align="right"><strong>${money(order.total_cents)}</strong></td></tr></table>
<p>Payment: ${esc(pay)}</p><p><a href="${link}">View your order</a></p>
<p style="color:#777;font-size:12px">Questions? Email ${esc(SUPPORT_EMAIL)}. — ${esc(SITE_NAME)}</p></div>`;
  return { subject: `${SUBJECTS[kind]} · #${order.id.slice(0, 8)}`, html };
}

/** Sends through Resend when RESEND_API_KEY is set; otherwise logs and skips. Never throws. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.warn("[email] RESEND_API_KEY is not set; skipping email to", to);
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env["EMAIL_FROM"] ?? `${SITE_NAME} <onboarding@resend.dev>`,
        to,
        subject,
        html,
      }),
    });
    if (!response.ok) console.error("[email] Resend error", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
