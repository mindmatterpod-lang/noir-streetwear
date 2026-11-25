import { z } from "zod";

import { clientIp, createRateLimiter } from "@/lib/rate-limit.server";

export interface TrackDeps {
  /** Orders whose id starts with the 8-hex prefix and whose shipping email matches (case-insensitive). */
  findOrders(prefix: string, email: string): Promise<{ id: string; guest_token: string }[]>;
  limiter: { check(key: string): boolean };
}

const Input = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^#?[0-9a-f]{8}$/i),
  email: z.string().trim().toLowerCase().email().max(320),
});

const NOT_FOUND = "We couldn't find an order matching those details.";

export type TrackResult =
  | { status: 200; body: { url: string } }
  | { status: 400 | 404 | 429 | 503; body: { error: string } };

/**
 * Guest order lookup. The customer must supply BOTH the order number and the email used at checkout; a wrong
 * combination always returns the same message, so nobody can probe which orders or emails exist. Throttled per IP and per email.
 */
export async function trackOrder(
  input: unknown,
  ip: string,
  deps: TrackDeps,
): Promise<TrackResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success)
    return {
      status: 400,
      body: { error: "Enter your 8-character order number and the email used at checkout." },
    };
  const { orderNumber, email } = parsed.data;
  if (!deps.limiter.check(`ip:${ip}`) || !deps.limiter.check(`email:${email}`))
    return {
      status: 429,
      body: { error: "Too many attempts. Please try again in a few minutes." },
    };
  const prefix = orderNumber.replace("#", "").toLowerCase();
  let rows: { id: string; guest_token: string }[];
  try {
    rows = await deps.findOrders(prefix, email);
  } catch {
    return {
      status: 503,
      body: { error: "Order lookup is unavailable right now. Please try again shortly." },
    };
  }
  const match = rows.length === 1 ? rows[0] : undefined;
  if (!match) return { status: 404, body: { error: NOT_FOUND } };
  return { status: 200, body: { url: `/order/${match.id}?token=${match.guest_token}` } };
}

const limiter = createRateLimiter(8, 10 * 60_000);

export async function handleTrackOrder(request: Request): Promise<Response> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
  const result = await trackOrder(await request.json().catch(() => null), clientIp(request), {
    limiter,
    async findOrders(prefix, email) {
      const { data, error } = await admin
        .from("orders")
        .select("id, guest_token")
        .gte("id", `${prefix}-0000-0000-0000-000000000000`)
        .lte("id", `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .ilike(
          "shipping_email",
          email.replace(/[\\%_]/g, (c) => `\\${c}`),
        )
        .limit(2);
      if (error) throw error;
      return (data ?? []) as { id: string; guest_token: string }[];
    },
  });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
