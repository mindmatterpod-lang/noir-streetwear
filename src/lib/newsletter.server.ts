import { z } from "zod";

import { clientIp, createRateLimiter } from "@/lib/rate-limit.server";

export interface NewsletterDeps {
  find(
    email: string,
  ): Promise<{ status: "subscribed" | "unsubscribed"; unsubscribe_token: string } | null>;
  insert(row: { email: string; unsubscribe_token: string; source: string }): Promise<void>;
  resubscribe(email: string): Promise<void>;
  /** Returns true if a subscriber with this token existed. */
  unsubscribeByToken(token: string): Promise<boolean>;
  sendWelcome(email: string, token: string): Promise<boolean>;
  newToken(): string;
  limiter: { check(key: string): boolean };
}

const Subscribe = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  /** Marketing emails need an explicit opt-in. */
  consent: z.literal(true),
  source: z.string().trim().max(40).optional(),
  /** Honeypot: real visitors never fill this in. */
  website: z.string().max(200).optional(),
});

export type NewsletterResult =
  | { status: 200; body: { status: "subscribed" | "already" | "resubscribed" | "unsubscribed" } }
  | { status: 400 | 404 | 429 | 503; body: { error: string } };

export class NotConfiguredError extends Error {}

export async function subscribe(
  input: unknown,
  ip: string,
  deps: NewsletterDeps,
): Promise<NewsletterResult> {
  const parsed = Subscribe.safeParse(input);
  if (!parsed.success)
    return {
      status: 400,
      body: { error: "Enter a valid email address and tick the consent box." },
    };
  if (parsed.data.website) return { status: 200, body: { status: "subscribed" } }; // bots get a silent no-op
  if (!deps.limiter.check(`news:${ip}`))
    return { status: 429, body: { error: "Too many attempts. Please try again later." } };
  const { email, source } = parsed.data;
  try {
    const existing = await deps.find(email);
    if (existing?.status === "subscribed") return { status: 200, body: { status: "already" } };
    if (existing) {
      await deps.resubscribe(email);
      await deps.sendWelcome(email, existing.unsubscribe_token);
      return { status: 200, body: { status: "resubscribed" } };
    }
    const token = deps.newToken();
    await deps.insert({ email, unsubscribe_token: token, source: source ?? "website" });
    await deps.sendWelcome(email, token);
    return { status: 200, body: { status: "subscribed" } };
  } catch (error) {
    if (error instanceof NotConfiguredError)
      return { status: 503, body: { error: "Newsletter sign-up isn't available yet." } };
    return { status: 503, body: { error: "Something went wrong. Please try again." } };
  }
}

export async function unsubscribe(token: unknown, deps: NewsletterDeps): Promise<NewsletterResult> {
  if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token))
    return { status: 400, body: { error: "This unsubscribe link is not valid." } };
  try {
    return (await deps.unsubscribeByToken(token))
      ? { status: 200, body: { status: "unsubscribed" } }
      : { status: 404, body: { error: "This unsubscribe link is not valid." } };
  } catch (error) {
    return error instanceof NotConfiguredError
      ? { status: 503, body: { error: "Newsletter isn't available yet." } }
      : { status: 503, body: { error: "Something went wrong. Please try again." } };
  }
}

const limiter = createRateLimiter(5, 60 * 60_000);
const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e &&
  (e.code === "42P01" ||
    e.code === "PGRST205" ||
    /does not exist|schema cache/i.test(e.message ?? ""));

export async function handleNewsletter(request: Request): Promise<Response> {
  const [{ supabaseAdmin }, { randomBytes }, { renderWelcomeEmail, sendEmail }] = await Promise.all(
    [
      import("@/integrations/supabase/client.server"),
      import("node:crypto"),
      import("@/lib/email.server"),
    ],
  );
  const admin = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
  const origin = new URL(request.url).origin;
  const guard = <T extends { code?: string; message?: string } | null>(error: T) => {
    if (missingTable(error)) throw new NotConfiguredError();
    if (error) throw error;
  };
  const deps: NewsletterDeps = {
    limiter,
    newToken: () => randomBytes(24).toString("hex"),
    async find(email) {
      const { data, error } = await admin
        .from("newsletter_subscribers")
        .select("status, unsubscribe_token")
        .eq("email", email)
        .maybeSingle();
      guard(error);
      return data as { status: "subscribed" | "unsubscribed"; unsubscribe_token: string } | null;
    },
    async insert(row) {
      const { error } = await admin
        .from("newsletter_subscribers")
        .insert({ ...row, status: "subscribed", consent_at: new Date().toISOString() });
      guard(error);
    },
    async resubscribe(email) {
      const { error } = await admin
        .from("newsletter_subscribers")
        .update({
          status: "subscribed",
          consent_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq("email", email);
      guard(error);
    },
    async unsubscribeByToken(token) {
      const { data, error } = await admin
        .from("newsletter_subscribers")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .eq("unsubscribe_token", token)
        .select("id");
      guard(error);
      return (data?.length ?? 0) > 0;
    },
    async sendWelcome(email, token) {
      const mail = renderWelcomeEmail(`${origin}/unsubscribe?token=${token}`, origin);
      return sendEmail(email, mail.subject, mail.html, {
        headers: { "List-Unsubscribe": `<${origin}/unsubscribe?token=${token}>` },
      });
    },
  };
  const body: unknown = await request.json().catch(() => null);
  const action = (body as { action?: string } | null)?.action;
  const result =
    action === "unsubscribe"
      ? await unsubscribe((body as { token?: unknown }).token, deps)
      : await subscribe(body, clientIp(request), deps);
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
