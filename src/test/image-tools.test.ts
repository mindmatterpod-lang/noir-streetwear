import { describe, expect, it } from "vitest";

import { optimizeImageUrl, supabaseStoragePath, validateImageUrl } from "@/lib/image-tools";

describe("validateImageUrl", () => {
  it("accepts https Cloudinary and ImageKit links", () => {
    expect(validateImageUrl("https://res.cloudinary.com/demo/image/upload/v1/hoodie.jpg").ok).toBe(
      true,
    );
    expect(validateImageUrl(" https://ik.imagekit.io/myshop/hoodie.jpg ").ok).toBe(true);
  });
  it("accepts a Supabase public storage link", () => {
    expect(
      validateImageUrl("https://abc.supabase.co/storage/v1/object/public/product-images/a/b.webp")
        .ok,
    ).toBe(true);
  });
  it("rejects http, other hosts, page links, spaces and junk", () => {
    for (const bad of [
      "http://res.cloudinary.com/demo/image/upload/a.jpg",
      "https://drive.google.com/file/d/123/view",
      "https://imgur.com/gallery/abc",
      "not a link",
      "javascript:alert(1)",
      "",
      "https://res.cloudinary.com/a b.jpg",
    ]) {
      expect(validateImageUrl(bad).ok).toBe(false);
    }
  });
});

describe("optimizeImageUrl", () => {
  it("adds resize + auto format for Cloudinary", () => {
    expect(
      optimizeImageUrl("https://res.cloudinary.com/demo/image/upload/v1/hoodie.jpg", 700),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_700/v1/hoodie.jpg",
    );
  });
  it("does not transform a Cloudinary link twice", () => {
    const once = optimizeImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/hoodie.jpg",
      700,
    );
    expect(optimizeImageUrl(once, 700)).toBe(once);
  });
  it("adds a resize transform for ImageKit and keeps existing ones", () => {
    expect(optimizeImageUrl("https://ik.imagekit.io/myshop/hoodie.jpg", 700)).toBe(
      "https://ik.imagekit.io/myshop/hoodie.jpg?tr=w-700%2Cq-80%2Cf-auto",
    );
    const custom = "https://ik.imagekit.io/myshop/hoodie.jpg?tr=w-300";
    expect(optimizeImageUrl(custom, 700)).toBe(custom);
  });
  it("leaves other and local images untouched", () => {
    expect(optimizeImageUrl("/assets/core-hoodie-abc123.jpg", 700)).toBe(
      "/assets/core-hoodie-abc123.jpg",
    );
    expect(
      optimizeImageUrl(
        "https://abc.supabase.co/storage/v1/object/public/product-images/a.webp",
        700,
      ),
    ).toContain("a.webp");
  });
});

describe("supabaseStoragePath", () => {
  it("extracts the object path for uploaded photos only", () => {
    expect(
      supabaseStoragePath(
        "https://abc.supabase.co/storage/v1/object/public/product-images/hoodie/1-a.webp",
      ),
    ).toBe("hoodie/1-a.webp");
    expect(supabaseStoragePath("https://res.cloudinary.com/demo/image/upload/a.jpg")).toBeNull();
  });
});
