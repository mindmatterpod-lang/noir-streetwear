import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  breadcrumbJsonLd,
  jsonLdScript,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { PRODUCTS } from "@/lib/store-catalog";

const base = "https://shop.test";
const product = PRODUCTS[0]!;

describe("structured data", () => {
  it("describes the product with real price, currency, availability and absolute URLs", () => {
    const ld = productJsonLd(product, null, base);
    expect(ld.offers.price).toBe((product.priceCents / 100).toFixed(2));
    expect(ld.offers.priceCurrency).toBe("PKR");
    expect(ld.offers.url).toBe(`${base}/product/${product.slug}`);
    expect(ld.offers.availability).toBe("https://schema.org/InStock");
    expect(ld.image.every((i: string) => i.startsWith("http"))).toBe(true);
    expect(productJsonLd({ ...product, stock: 0 }, null, base).offers.availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });
  it("never invents a rating", () => {
    expect("aggregateRating" in productJsonLd(product, null, base)).toBe(false);
    expect("aggregateRating" in productJsonLd(product, { average: 5, count: 0 }, base)).toBe(false);
    const ld = productJsonLd(product, { average: 4.5, count: 12 }, base) as {
      aggregateRating?: { reviewCount: number; ratingValue: number };
    };
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 12 });
  });
  it("builds ordered breadcrumbs, organisation and website data", () => {
    const b = breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Hoodies", path: "/shop?category=Hoodies" },
      ],
      base,
    );
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(b.itemListElement[1]!.item).toBe(`${base}/shop?category=Hoodies`);
    expect(organizationJsonLd(base).url).toBe(base);
    expect(websiteJsonLd(base).potentialAction.target.urlTemplate).toContain(
      "/shop?q={search_term_string}",
    );
  });
  it("escapes markup so catalogue text cannot break out of the script tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)" }).children).not.toContain("</script>");
    expect(absoluteUrl("/a.png", base)).toBe(`${base}/a.png`);
    expect(absoluteUrl("https://cdn.test/a.png", base)).toBe("https://cdn.test/a.png");
  });
});
