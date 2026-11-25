import { supportEmail } from "@/lib/contact";
import { SITE_NAME } from "@/lib/site-config";

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
const money = (paisa: number) =>
  `Rs ${(paisa / 100).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

export interface EmailOrder {
  id: string;
  guest_token: string;
  shipping_name: string;
  shipping_email: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string | null;
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
  confirmation: "YOUR NOWHERE ORDER IS CONFIRMED.",
  processing: "WE'RE PREPARING YOUR NOWHERE ORDER.",
  shipped: "YOUR ORDER IS ON THE MOVE.",
  delivered: "YOUR NOWHERE ORDER HAS ARRIVED.",
  cancelled: "YOUR NOWHERE ORDER WAS CANCELLED.",
};
const INTRO: Record<OrderEmailKind, string[]> = {
  confirmation: [
    "Thank you for choosing NOWHERE.",
    "Your order has been received and is being prepared.",
  ],
  processing: ["Good news: we've started preparing your order."],
  shipped: ["Your NOWHERE order has been dispatched."],
  delivered: ["Your order has been delivered.", "We hope you enjoy your new pieces."],
  cancelled: [
    "Your order has been cancelled.",
    "If you paid by card, any charge will be refunded.",
  ],
};

const INK = "#101010";
const PAPER = "#F5F3EF";
const MUTE = "#A5A5A5";
const LINE = "#303030";

/** Shared dark, minimal layout. Table-based with inline styles so it holds up in mail clients. */
function shell(inner: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:${PAPER}">
<tr><td style="padding-bottom:28px;font-size:20px;font-weight:700;letter-spacing:8px">NOWHERE.</td></tr>
${inner}
<tr><td style="padding-top:32px;border-top:1px solid ${LINE};font-size:12px;line-height:1.6;color:${MUTE}">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${PAPER};color:${INK};padding:14px 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none">${esc(label)}</a>`;

export function renderOrderEmail(order: EmailOrder, kind: OrderEmailKind, origin: string) {
  const link = `${origin}/order/${order.id}?token=${order.guest_token}`;
  const row = (a: string, b: string, strong = false) =>
    `<tr><td style="padding:6px 0;${strong ? "font-weight:700;" : ""}">${a}</td><td align="right" style="padding:6px 0;${strong ? "font-weight:700;" : ""}">${b}</td></tr>`;
  const rows = order.items
    .map((i) =>
      row(
        `${esc(i.name)}<br><span style="color:${MUTE};font-size:12px">${esc(i.size)} · ${esc(i.color)} × ${i.quantity}</span>`,
        money(i.unit_price_cents * i.quantity),
      ),
    )
    .join("");
  const tracking =
    (kind === "shipped" || kind === "delivered") && order.tracking_number
      ? `<p style="margin:16px 0 0"><strong>Tracking number:</strong> ${esc(order.tracking_number)}</p>`
      : "";
  const pay =
    order.payment_method === "cod"
      ? "Cash on delivery"
      : order.payment_status === "paid"
        ? "Paid by card"
        : "Card payment pending";
  const address = [order.shipping_address, order.shipping_city, order.shipping_postal_code]
    .filter((p): p is string => !!p)
    .map(esc)
    .join(", ");
  const showSummary = true;
  const intro = INTRO[kind]
    .map((p) => `<p style="margin:0 0 8px;font-size:15px">${esc(p)}</p>`)
    .join("");
  const inner = `<tr><td>
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.1;letter-spacing:1px">${esc(SUBJECTS[kind])}</h1>
<p style="margin:0 0 12px;color:${MUTE}">Order #${esc(order.id.slice(0, 8))}</p>
${intro}${tracking}
${
  showSummary
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${LINE};font-size:14px">${rows}
${row("Subtotal", money(order.subtotal_cents))}
${order.discount_cents ? row("Discount", `−${money(order.discount_cents)}`) : ""}
${row("Shipping", order.shipping_cents ? money(order.shipping_cents) : "Free")}
${order.tax_cents ? row("Tax", money(order.tax_cents)) : ""}
${row("Total", money(order.total_cents), true)}</table>
<p style="margin:16px 0 0;font-size:14px"><span style="color:${MUTE}">Payment</span><br>${esc(pay)}</p>
${address ? `<p style="margin:16px 0 0;font-size:14px"><span style="color:${MUTE}">Delivering to</span><br>${esc(order.shipping_name)}<br>${address}</p>` : ""}`
    : ""
}
<p style="margin:28px 0 0">${button(link, "View your order")}</p>
</td></tr>`;
  const email = supportEmail();
  const footer = `${email ? `Questions? Email ${esc(email)}. ` : ""}${esc(SITE_NAME)}. You are receiving this because you placed an order.`;
  return { subject: `${SUBJECTS[kind]} · #${order.id.slice(0, 8)}`, html: shell(inner, footer) };
}

export function renderWelcomeEmail(unsubscribeUrl: string, origin: string) {
  const inner = `<tr><td>
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.1;letter-spacing:1px">WELCOME TO NOWHERE.</h1>
<p style="margin:0 0 8px;font-size:15px">You're now part of the NOWHERE world.</p>
<p style="margin:0 0 8px;font-size:15px">Stay close to new releases, exclusive drops, and everything happening next.</p>
<p style="margin:28px 0 0">${button(`${origin}/shop?sort=newest`, "Shop new arrivals")}</p>
</td></tr>`;
  const footer = `You're receiving this because you subscribed at ${esc(origin.replace(/^https?:\/\//, ""))}. <a href="${esc(unsubscribeUrl)}" style="color:${MUTE}">Unsubscribe</a> at any time.`;
  return { subject: "WELCOME TO NOWHERE.", html: shell(inner, footer) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise logs and skips. Never throws.
 * Provider outages (network errors, 429, 5xx) are retried with backoff; other errors (bad address, bad key) are not.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: { headers?: Record<string, string>; attempts?: number } = {},
): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.warn("[email] RESEND_API_KEY is not set; skipping email");
    return false;
  }
  const attempts = options.attempts ?? 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: process.env["EMAIL_FROM"] ?? `${SITE_NAME} <onboarding@resend.dev>`,
          to,
          subject,
          html,
          ...(options.headers ? { headers: options.headers } : {}),
        }),
      });
      if (response.ok) return true;
      const retryable = response.status === 429 || response.status >= 500;
      console.error(
        "[email] Resend error",
        response.status,
        retryable ? "(retryable)" : "(permanent)",
      );
      if (!retryable) return false;
    } catch (error) {
      console.error("[email] send failed", error instanceof Error ? error.message : error);
    }
    if (attempt < attempts) await sleep(400 * 2 ** (attempt - 1));
  }
  return false;
}
