export const stripeConfigured = () => Boolean(process.env["STRIPE_SECRET_KEY"]);

async function stripePost(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["STRIPE_SECRET_KEY"] ?? ""}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      `Stripe error: ${(json["error"] as { message?: string } | undefined)?.message ?? response.status}`,
    );
  return json;
}

export interface SessionInput {
  orderId: string;
  guestToken: string;
  email: string;
  origin: string;
  items: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price_cents: number;
  }[];
  discountCents: number;
  shippingCents: number;
  taxCents: number;
}

/** Totals are computed by the database; Stripe only mirrors them as line items and one coupon. */
export async function createCheckoutSession(
  input: SessionInput,
): Promise<{ id: string; url: string }> {
  const p = new URLSearchParams({
    mode: "payment",
    success_url: `${input.origin}/order/${input.orderId}?token=${input.guestToken}&paid=1`,
    cancel_url: `${input.origin}/checkout`,
    customer_email: input.email,
    client_reference_id: input.orderId,
    "metadata[order_id]": input.orderId,
  });
  const lines = [
    ...input.items.map((i) => ({
      name: `${i.name} (${i.size}, ${i.color})`,
      amount: i.unit_price_cents,
      quantity: i.quantity,
    })),
    ...(input.shippingCents > 0
      ? [{ name: "Shipping", amount: input.shippingCents, quantity: 1 }]
      : []),
    ...(input.taxCents > 0 ? [{ name: "Tax", amount: input.taxCents, quantity: 1 }] : []),
  ];
  lines.forEach((l, n) => {
    p.set(`line_items[${n}][price_data][currency]`, "pkr");
    p.set(`line_items[${n}][price_data][product_data][name]`, l.name);
    p.set(`line_items[${n}][price_data][unit_amount]`, String(l.amount));
    p.set(`line_items[${n}][quantity]`, String(l.quantity));
  });
  if (input.discountCents > 0) {
    const coupon = await stripePost(
      "/coupons",
      new URLSearchParams({
        amount_off: String(input.discountCents),
        currency: "pkr",
        duration: "once",
      }),
    );
    p.set("discounts[0][coupon]", String(coupon["id"]));
  }
  const session = await stripePost("/checkout/sessions", p);
  return { id: String(session["id"]), url: String(session["url"]) };
}

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Verifies the `Stripe-Signature` header (t=timestamp,v1=hmac) against the raw request body. */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Date.now(),
): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const timestamp = parts["t"];
  const signatures = header
    .split(",")
    .filter((kv) => kv.startsWith("v1="))
    .map((kv) => kv.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > toleranceSeconds) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)),
  );
  return signatures.some(
    (s) =>
      s.length === expected.length &&
      s.split("").reduce((acc, ch, i) => acc | (ch.charCodeAt(0) ^ expected.charCodeAt(i)), 0) ===
        0,
  );
}
