import { describe, expect, it } from "vitest";

import { isPlaceholder, supportMessages, whatsappDigits, whatsappLink } from "@/lib/contact";
import { buildTimeline, orderNumber } from "@/lib/order-status";
import { createRateLimiter } from "@/lib/rate-limit.server";

describe("contact helpers", () => {
  it("treats the template placeholders as unconfigured", () => {
    expect(isPlaceholder("+92 300 0000000")).toBe(true);
    expect(isPlaceholder("support@nowhere.example")).toBe(true);
    expect(whatsappDigits("+92 300 0000000")).toBeNull();
    expect(whatsappLink("hi", "+92 300 0000000")).toBeNull();
  });
  it("normalises real Pakistani numbers", () => {
    expect(whatsappDigits("+92 300 1234567")).toBe("923001234567");
    expect(whatsappDigits("0300-1234567")).toBe("923001234567");
    expect(whatsappDigits("923001234567")).toBe("923001234567");
    expect(whatsappDigits("123")).toBeNull();
  });
  it("URL-encodes prefilled messages", () => {
    const url = whatsappLink(supportMessages.product("Studio Hoodie & Co"), "03001234567")!;
    expect(url.startsWith("https://wa.me/923001234567?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1]!)).toBe(
      "Hi NOWHERE, I have a question about Studio Hoodie & Co.",
    );
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&Co");
  });
});

describe("buildTimeline", () => {
  it("marks progress from the real status", () => {
    const t = buildTimeline("shipped");
    expect(t.steps.map((s) => [s.key, s.state])).toEqual([
      ["pending", "done"],
      ["processing", "done"],
      ["shipped", "current"],
      ["delivered", "upcoming"],
    ]);
  });
  it("shows a delivered order as fully complete and a cancelled one as cancelled", () => {
    expect(buildTimeline("delivered").steps.every((s) => s.state === "done")).toBe(true);
    expect(buildTimeline("cancelled")).toEqual({ steps: [], cancelled: true });
    expect(orderNumber("1234567890abcdef")).toBe("#12345678");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    let t = 0;
    const rl = createRateLimiter(2, 1000, () => t);
    expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(false);
    expect(rl.check("other")).toBe(true);
    t = 1500;
    expect(rl.check("ip")).toBe(true);
  });
});
