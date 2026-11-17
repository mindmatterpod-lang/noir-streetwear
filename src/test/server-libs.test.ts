import { describe, expect, it } from "vitest";

import { renderOrderEmail, type EmailOrder } from "@/lib/email.server";
import { verifyStripeSignature } from "@/lib/stripe.server";

async function sign(body: string, secret: string, t: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("verifyStripeSignature", () => {
  const body = '{"type":"checkout.session.completed"}';
  const now = 1_800_000_000_000;
  const t = now / 1000;
  it("accepts a valid signature", async () => {
    expect(
      await verifyStripeSignature(
        body,
        `t=${t},v1=${await sign(body, "whsec_x", t)}`,
        "whsec_x",
        300,
        now,
      ),
    ).toBe(true);
  });
  it("rejects a tampered body, wrong secret, missing header and stale timestamps", async () => {
    const header = `t=${t},v1=${await sign(body, "whsec_x", t)}`;
    expect(await verifyStripeSignature(body + " ", header, "whsec_x", 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, header, "whsec_other", 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, null, "whsec_x", 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, header, "whsec_x", 300, now + 10 * 60 * 1000)).toBe(
      false,
    );
  });
});

describe("renderOrderEmail", () => {
  const order: EmailOrder = {
    id: "12345678-aaaa-bbbb-cccc-1234567890ab",
    guest_token: "tok",
    shipping_name: "<script>alert(1)</script>",
    shipping_email: "a@b.co",
    status: "shipped",
    payment_method: "cod",
    payment_status: "unpaid",
    tracking_number: "TRK123",
    subtotal_cents: 11800,
    discount_cents: 1180,
    shipping_cents: 0,
    tax_cents: 0,
    total_cents: 10620,
    items: [{ name: "Hoodie", size: "M", color: "ink", quantity: 1, unit_price_cents: 11800 }],
  };
  it("escapes customer-supplied text", () => {
    expect(renderOrderEmail(order, "shipped", "https://x.test").html).not.toContain("<script>");
  });
  it("includes tracking, totals and a secure order link", () => {
    const { subject, html } = renderOrderEmail(order, "shipped", "https://x.test");
    expect(subject).toContain("#12345678");
    expect(html).toContain("TRK123");
    expect(html).toContain("$106.20");
    expect(html).toContain("https://x.test/order/12345678-aaaa-bbbb-cccc-1234567890ab?token=tok");
  });
});
