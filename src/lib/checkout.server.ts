import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  renderOrderEmail,
  sendEmail,
  type EmailOrder,
  type OrderEmailKind,
} from "@/lib/email.server";
import {
  createCheckoutSession,
  stripeConfigured,
  verifyStripeSignature,
} from "@/lib/stripe.server";

const admin = supabaseAdmin as unknown as SupabaseClient;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const text = (min: number, max: number) => z.string().trim().min(min).max(max);

const Body = z.object({
  items: z
    .array(
      z.object({
        slug: text(1, 120),
        size: z.enum(["S", "M", "L", "XL", "XXL"]),
        color: z.enum(["ink", "cherry", "fern", "cloud", "navy"]),
        quantity: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(20),
  customer: z.object({
    name: text(2, 120),
    email: z.string().trim().email().max(320),
    address: text(5, 240),
    city: text(2, 100),
    postal_code: text(2, 24),
    country: text(2, 100),
  }),
  code: z.string().trim().max(40).nullish(),
  method: z.enum(["cod", "card"]),
});

async function userIdFromRequest(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

async function loadEmailOrder(orderId: string): Promise<EmailOrder | null> {
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const { data: items } = await admin
    .from("order_items")
    .select("product_name, size, color, quantity, unit_price_cents")
    .eq("order_id", orderId);
  return {
    ...(order as Omit<EmailOrder, "items">),
    items: (items ?? []).map((i: { product_name: string }) => ({
      ...(i as object),
      name: i.product_name,
    })) as EmailOrder["items"],
  };
}

export async function notifyOrder(orderId: string, kind: OrderEmailKind, origin: string) {
  const order = await loadEmailOrder(orderId);
  if (!order) return false;
  const { subject, html } = renderOrderEmail(order, kind, origin);
  return sendEmail(order.shipping_email, subject, html);
}

export function configResponse() {
  return json({ card: stripeConfigured() });
}

export async function handleCheckout(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Please check your details and try again." }, 400);
  const { items, customer, code, method } = parsed.data;
  if (method === "card" && !stripeConfigured())
    return json({ error: "Card payments are not available right now." }, 400);

  const { data: rows, error: lookupError } = await admin
    .from("products")
    .select("id, slug")
    .in(
      "slug",
      items.map((i) => i.slug),
    )
    .eq("status", "published");
  if (lookupError) return json({ error: "Could not load products." }, 500);
  const idBySlug = new Map((rows ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]));
  const lines = items.map((i) => ({
    product_id: idBySlug.get(i.slug),
    size: i.size,
    color: i.color,
    quantity: i.quantity,
  }));
  if (lines.some((l) => !l.product_id))
    return json({ error: "An item in your bag is no longer available." }, 400);

  const { data, error } = await admin.rpc("create_order_from_checkout", {
    p_user: await userIdFromRequest(request),
    p_name: customer.name,
    p_email: customer.email,
    p_address: customer.address,
    p_city: customer.city,
    p_postal: customer.postal_code,
    p_country: customer.country,
    p_items: lines,
    p_code: code ?? null,
    p_method: method,
  });
  if (error || !data) return json({ error: error?.message ?? "Could not place your order." }, 400);
  const order = data as {
    id: string;
    guest_token: string;
    discount_cents: number;
    shipping_cents: number;
    tax_cents: number;
    items: SessionItems;
  };
  const origin = new URL(request.url).origin;

  if (method === "card") {
    try {
      const session = await createCheckoutSession({
        orderId: order.id,
        guestToken: order.guest_token,
        email: customer.email.toLowerCase(),
        origin,
        items: order.items,
        discountCents: order.discount_cents,
        shippingCents: order.shipping_cents,
        taxCents: order.tax_cents,
      });
      await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
      return json({ url: session.url, orderId: order.id });
    } catch (e) {
      console.error(e);
      await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      return json(
        { error: "Could not start card payment. Please try again or choose cash on delivery." },
        502,
      );
    }
  }
  await notifyOrder(order.id, "confirmation", origin);
  return json({ orderId: order.id, token: order.guest_token });
}
type SessionItems = {
  name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price_cents: number;
}[];

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) return json({ error: "Webhook not configured" }, 500);
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)))
    return json({ error: "Invalid signature" }, 400);
  const event = JSON.parse(raw) as {
    type: string;
    data: { object: { id: string; payment_status?: string } };
  };
  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const { data: updated } = await admin
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("stripe_session_id", event.data.object.id)
      .eq("payment_status", "unpaid")
      .select("id");
    // Only the first delivery flips unpaid -> paid, so retries never send a duplicate email.
    for (const row of (updated ?? []) as { id: string }[])
      await notifyOrder(row.id, "confirmation", new URL(request.url).origin);
  }
  return json({ received: true });
}

export async function handleOrderStatusNotify(request: Request): Promise<Response> {
  const userId = await userIdFromRequest(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Forbidden" }, 403);
  const body = z
    .object({ orderId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "Bad request" }, 400);
  const { data: order } = await admin
    .from("orders")
    .select("status")
    .eq("id", body.data.orderId)
    .maybeSingle();
  const status = (order as { status?: string } | null)?.status;
  if (!status || !["processing", "shipped", "delivered", "cancelled"].includes(status))
    return json({ sent: false });
  const sent = await notifyOrder(
    body.data.orderId,
    status as OrderEmailKind,
    new URL(request.url).origin,
  );
  return json({ sent });
}
