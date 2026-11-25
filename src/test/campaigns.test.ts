import { describe, expect, it } from "vitest";

import { isLive, safeCtaUrl, type Campaign } from "@/lib/campaigns";

const base: Campaign = {
  id: "1",
  title: "Drop 01",
  description: null,
  cta_label: null,
  cta_url: null,
  image_url: null,
  starts_at: "2026-11-01T00:00:00Z",
  ends_at: "2026-12-01T00:00:00Z",
  active: true,
};
const now = new Date("2026-11-15T00:00:00Z").getTime();

describe("campaign visibility", () => {
  it("shows only active campaigns inside their window", () => {
    expect(isLive(base, now)).toBe(true);
    expect(isLive({ ...base, active: false }, now)).toBe(false);
    expect(isLive({ ...base, starts_at: "2026-11-20T00:00:00Z" }, now)).toBe(false);
    expect(isLive({ ...base, ends_at: "2026-11-10T00:00:00Z" }, now)).toBe(false);
    expect(isLive({ ...base, ends_at: null }, now)).toBe(true);
  });
});

describe("safeCtaUrl", () => {
  it("allows internal paths and https only", () => {
    expect(safeCtaUrl("/shop?category=Hoodies")).toBe("/shop?category=Hoodies");
    expect(safeCtaUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(safeCtaUrl("javascript:alert(1)")).toBeNull();
    expect(safeCtaUrl("//evil.com")).toBeNull();
    expect(safeCtaUrl("http://example.com")).toBeNull();
    expect(safeCtaUrl("data:text/html,x")).toBeNull();
    expect(safeCtaUrl(null)).toBeNull();
  });
});
