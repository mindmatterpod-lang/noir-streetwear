import { describe, expect, it, vi } from "vitest";

import { renderOrderEmail, renderWelcomeEmail, type EmailOrder } from "@/lib/email.server";
import {
  subscribe,
  unsubscribe,
  NotConfiguredError,
  type NewsletterDeps,
} from "@/lib/newsletter.server";
import { createRateLimiter } from "@/lib/rate-limit.server";
import { trackOrder, type TrackDeps } from "@/lib/track-order.server";

const ID = "1234abcd-0000-4000-8000-000000000001";

function trackDeps(rows = [{ id: ID, guest_token: "tok" }]): TrackDeps & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    limiter: createRateLimiter(3, 60_000),
    findOrders: async (prefix, email) => {
      calls.push([prefix, email]);
      return prefix === "1234abcd" && email === "a@b.co" ? rows : [];
    },
  };
}

describe("trackOrder (guest tracking)", () => {
  it("returns the order link only when order number AND email both match", async () => {
    const r = await trackOrder(
      { orderNumber: "#1234ABCD", email: " A@B.co " },
      "1.1.1.1",
      trackDeps(),
    );
    expect(r).toEqual({ status: 200, body: { url: `/order/${ID}?token=tok` } });
  });
  it("gives an identical answer for a wrong email and an unknown order (no enumeration)", async () => {
    const d = trackDeps();
    const wrongEmail = await trackOrder({ orderNumber: "1234abcd", email: "x@y.co" }, "ip", d);
    const unknown = await trackOrder({ orderNumber: "ffffffff", email: "a@b.co" }, "ip", d);
    expect(wrongEmail).toEqual(unknown);
    expect(wrongEmail.status).toBe(404);
  });
  it("rejects malformed input before touching the database", async () => {
    const d = trackDeps();
    expect((await trackOrder({ orderNumber: "123", email: "a@b.co" }, "ip", d)).status).toBe(400);
    expect((await trackOrder({ orderNumber: "1234abcd", email: "nope" }, "ip", d)).status).toBe(
      400,
    );
    expect(d.calls).toHaveLength(0);
  });
  it("does not resolve ambiguous matches", async () => {
    const d = trackDeps([
      { id: ID, guest_token: "a" },
      { id: ID.replace("0001", "0002"), guest_token: "b" },
    ]);
    expect((await trackOrder({ orderNumber: "1234abcd", email: "a@b.co" }, "ip", d)).status).toBe(
      404,
    );
  });
  it("rate limits repeated guessing", async () => {
    const d = trackDeps();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++)
      statuses.push(
        (await trackOrder({ orderNumber: `0000000${i}`, email: "a@b.co" }, "ip", d)).status,
      );
    expect(statuses).toEqual([404, 404, 404, 429, 429]);
  });
  it("reports lookup failures without leaking details", async () => {
    const d = {
      ...trackDeps(),
      findOrders: async () => Promise.reject(new Error("db password leaked")),
    };
    const r = await trackOrder({ orderNumber: "1234abcd", email: "a@b.co" }, "ip", d);
    expect(r.status).toBe(503);
    expect(JSON.stringify(r)).not.toContain("leaked");
  });
});

function newsDeps(initial: Record<string, "subscribed" | "unsubscribed"> = {}) {
  const store = new Map(
    Object.entries(initial).map(([e, status]) => [
      e,
      { status, unsubscribe_token: "c".repeat(48) },
    ]),
  );
  const welcome = vi.fn(async () => true);
  const deps: NewsletterDeps = {
    limiter: createRateLimiter(100, 60_000),
    newToken: () => "a".repeat(48),
    find: async (e) => store.get(e) ?? null,
    insert: async (r) =>
      void store.set(r.email, { status: "subscribed", unsubscribe_token: r.unsubscribe_token }),
    resubscribe: async (e) => void store.set(e, { ...store.get(e)!, status: "subscribed" }),
    unsubscribeByToken: async (t) => {
      for (const [e, v] of store)
        if (v.unsubscribe_token === t)
          return (store.set(e, { ...v, status: "unsubscribed" }), true);
      return false;
    },
    sendWelcome: welcome,
  };
  return { deps, store, welcome };
}

describe("newsletter", () => {
  it("requires a valid email and explicit consent", async () => {
    const { deps, store } = newsDeps();
    expect((await subscribe({ email: "bad", consent: true }, "ip", deps)).status).toBe(400);
    expect((await subscribe({ email: "a@b.co", consent: false }, "ip", deps)).status).toBe(400);
    expect((await subscribe({ email: "a@b.co" }, "ip", deps)).status).toBe(400);
    expect(store.size).toBe(0);
  });
  it("subscribes once, normalises the email and sends one welcome email", async () => {
    const { deps, store, welcome } = newsDeps();
    expect(await subscribe({ email: " A@B.co ", consent: true }, "ip", deps)).toEqual({
      status: 200,
      body: { status: "subscribed" },
    });
    expect(store.get("a@b.co")?.status).toBe("subscribed");
    expect(welcome).toHaveBeenCalledTimes(1);
  });
  it("handles duplicates without a second welcome email", async () => {
    const { deps, welcome } = newsDeps({ "a@b.co": "subscribed" });
    expect((await subscribe({ email: "a@b.co", consent: true }, "ip", deps)).body).toEqual({
      status: "already",
    });
    expect(welcome).not.toHaveBeenCalled();
  });
  it("lets an unsubscribed address opt back in", async () => {
    const { deps, store } = newsDeps({ "a@b.co": "unsubscribed" });
    expect((await subscribe({ email: "a@b.co", consent: true }, "ip", deps)).body).toEqual({
      status: "resubscribed",
    });
    expect(store.get("a@b.co")?.status).toBe("subscribed");
  });
  it("ignores bot submissions (honeypot) and rate limits floods", async () => {
    const { deps, store } = newsDeps();
    await subscribe({ email: "bot@b.co", consent: true, website: "http://spam" }, "ip", deps);
    expect(store.size).toBe(0);
    const tight = { ...deps, limiter: createRateLimiter(1, 60_000) };
    await subscribe({ email: "a@b.co", consent: true }, "ip2", tight);
    expect((await subscribe({ email: "c@b.co", consent: true }, "ip2", tight)).status).toBe(429);
  });
  it("unsubscribes by token and rejects bad tokens", async () => {
    const { deps, store } = newsDeps({ "a@b.co": "subscribed" });
    expect((await unsubscribe("short", deps)).status).toBe(400);
    expect((await unsubscribe("f".repeat(48), deps)).status).toBe(404);
    expect((await unsubscribe("c".repeat(48), deps)).body).toEqual({ status: "unsubscribed" });
    expect(store.get("a@b.co")?.status).toBe("unsubscribed");
  });
  it("reports a missing table as unavailable rather than crashing", async () => {
    const { deps } = newsDeps();
    const broken = { ...deps, find: async () => Promise.reject(new NotConfiguredError()) };
    expect((await subscribe({ email: "a@b.co", consent: true }, "ip", broken)).status).toBe(503);
  });
});

const order: EmailOrder = {
  id: ID,
  guest_token: "tok",
  shipping_name: "Ali <b>Khan</b>",
  shipping_email: "a@b.co",
  shipping_address: "House 1, Street 2",
  shipping_city: "Lahore",
  shipping_postal_code: null,
  status: "pending",
  payment_method: "cod",
  payment_status: "unpaid",
  tracking_number: "TRK123",
  subtotal_cents: 649900,
  discount_cents: 0,
  shipping_cents: 25000,
  tax_cents: 0,
  total_cents: 674900,
  items: [
    { name: "Studio Hoodie", size: "M", color: "ink", quantity: 1, unit_price_cents: 649900 },
  ],
};

describe("branded emails", () => {
  it("uses the requested subjects and copy", () => {
    const c = renderOrderEmail(order, "confirmation", "https://x.test");
    expect(c.subject).toContain("YOUR NOWHERE ORDER IS CONFIRMED.");
    expect(c.html).toContain("Thank you for choosing NOWHERE.");
    expect(c.html).toContain("Your order has been received and is being prepared.");
    expect(renderOrderEmail(order, "shipped", "https://x.test").subject).toContain(
      "YOUR ORDER IS ON THE MOVE.",
    );
    expect(renderOrderEmail(order, "delivered", "https://x.test").subject).toContain(
      "YOUR NOWHERE ORDER HAS ARRIVED.",
    );
    expect(renderWelcomeEmail("https://x.test/unsubscribe?token=t", "https://x.test").subject).toBe(
      "WELCOME TO NOWHERE.",
    );
  });
  it("includes order number, total, delivery address and a tracking link, and escapes customer text", () => {
    const { html } = renderOrderEmail(order, "confirmation", "https://x.test");
    expect(html).toContain("Order #1234abcd");
    expect(html).toContain("Rs 6,749");
    expect(html).toContain("House 1, Street 2, Lahore");
    expect(html).toContain("https://x.test/order/" + ID + "?token=tok");
    expect(html).not.toContain("<b>Khan</b>");
  });
  it("shows the tracking number only once dispatched", () => {
    expect(renderOrderEmail(order, "shipped", "https://x.test").html).toContain("TRK123");
    expect(renderOrderEmail(order, "confirmation", "https://x.test").html).not.toContain("TRK123");
  });
  it("puts an unsubscribe link in the welcome email", () => {
    expect(
      renderWelcomeEmail("https://x.test/unsubscribe?token=t", "https://x.test").html,
    ).toContain("unsubscribe?token=t");
  });
});
