import { db } from "@/lib/db";
import { SITE_NAME, SITE_URL, SOCIAL_LINKS } from "@/lib/site-config";
import type { Product } from "@/types/store";

export interface RatingSummary {
  average: number;
  count: number;
}

export const absoluteUrl = (path: string, base: string = SITE_URL) =>
  /^https?:\/\//i.test(path) ? path : new URL(path, base).toString();

/** Genuine rating summary from the reviews table, or null when there are no reviews or they cannot be loaded. */
export async function fetchRatingSummary(
  productId: string | undefined,
): Promise<RatingSummary | null> {
  if (!productId) return null;
  try {
    const { data, error } = await db.from("reviews").select("rating").eq("product_id", productId);
    if (error || !data?.length) return null;
    const ratings = (data as { rating: number }[]).map((r) => r.rating);
    return {
      average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  } catch {
    return null;
  }
}

export function productJsonLd(p: Product, rating: RatingSummary | null, base: string = SITE_URL) {
  const images = (
    p.images?.length ? p.images : [p.image, ...(p.alternateImage ? [p.alternateImage] : [])]
  ).map((i) => absoluteUrl(i, base));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    category: p.category,
    sku: p.slug,
    image: images,
    brand: { "@type": "Brand", name: SITE_NAME.toUpperCase() },
    offers: {
      "@type": "Offer",
      url: `${base}/product/${p.slug}`,
      priceCurrency: "PKR",
      price: (p.priceCents / 100).toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    // Only when real reviews exist, and the same reviews are shown on the page.
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average,
            reviewCount: rating.count,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], base: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path, base),
    })),
  };
}

export function organizationJsonLd(base: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME.toUpperCase(),
    url: base,
    logo: absoluteUrl("/og-image.png", base),
    ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS.map((s) => s.href) } : {}),
  };
}

export function websiteJsonLd(base: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME.toUpperCase(),
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/shop?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export const jsonLdScript = (data: unknown) => ({
  type: "application/ld+json",
  // "<" is escaped so catalogue text can never close the script tag.
  children: JSON.stringify(data).replace(/</g, "\\u003c"),
});
