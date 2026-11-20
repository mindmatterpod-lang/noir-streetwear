import { CORE_CATEGORIES, type CatalogSort, type Product } from "@/types/store";

import bomber from "@/assets/bomber-jacket.jpg";
import hoodie from "@/assets/core-hoodie.jpg";
import tracksuit from "@/assets/core-tracksuit.jpg";
import hoodieAlternate from "@/assets/hoodie-alternate.jpg";
import navyTracksuit from "@/assets/navy-tracksuit.jpg";
import shirt from "@/assets/oversized-shirt.jpg";
import trousers from "@/assets/tailored-trousers.jpg";
import stripedShirt from "@/assets/striped-shirt.jpg";
import jacket from "@/assets/technical-jacket.jpg";
import trackAlternate from "@/assets/tracksuit-alternate.jpg";
import utilityTrousers from "@/assets/utility-trousers.jpg";

export { CORE_CATEGORIES };

// Local lookbook content keeps the storefront usable before its later database connection.
export const PRODUCTS: Product[] = [
  {
    id: "studio-hoodie",
    slug: "studio-hoodie",
    name: "Studio Heavyweight Hoodie",
    description:
      "A substantial brushed-cotton layer with a relaxed drape and considered everyday weight. Cut for easy layering, with a softly structured hood and a finish that gets better with wear.",
    category: "Hoodies",
    priceCents: 649900,
    image: hoodie,
    alternateImage: hoodieAlternate,
    colors: ["cherry", "ink", "cloud"],
    createdAt: "2026-11-15",
    stock: 24,
    badge: "Bestseller",
  },
  {
    id: "after-hours-hoodie",
    slug: "after-hours-hoodie",
    name: "After Hours Hoodie",
    description:
      "An everyday essential in brushed fleece. An oversized shape meets deep color and the kind of weight you feel right away.",
    category: "Hoodies",
    priceCents: 699900,
    image: hoodie,
    colors: ["cherry", "ink"],
    createdAt: "2026-11-12",
    stock: 16,
  },
  {
    id: "evergreen-track-set",
    slug: "evergreen-track-set",
    name: "Evergreen Track Set",
    description:
      "A matching technical warm-up set with clean piping, easy movement, and a quietly confident finish.",
    category: "Tracksuits",
    priceCents: 899900,
    image: tracksuit,
    alternateImage: trackAlternate,
    colors: ["fern", "ink"],
    createdAt: "2026-11-14",
    stock: 12,
    badge: "New arrival",
  },
  {
    id: "midnight-track-set",
    slug: "midnight-track-set",
    name: "Midnight Track Set",
    description:
      "A full two-piece track set cut in a smooth technical knit. A little piping, a lot of versatility.",
    category: "Tracksuits",
    priceCents: 949900,
    image: navyTracksuit,
    colors: ["navy", "ink"],
    createdAt: "2026-11-08",
    stock: 9,
  },
  {
    id: "signal-shell-jacket",
    slug: "signal-shell-jacket",
    name: "Signal Shell Jacket",
    description:
      "A lightweight technical layer with practical storage and a vivid red shell that stands on its own.",
    category: "Jackets",
    priceCents: 849900,
    image: jacket,
    colors: ["cherry", "ink", "fern"],
    createdAt: "2026-11-13",
    stock: 14,
    badge: "New arrival",
  },
  {
    id: "city-bomber",
    slug: "city-bomber",
    name: "City Bomber",
    description:
      "The everyday bomber, rethought in a quieter graphite finish with a soft technical hand.",
    category: "Jackets",
    priceCents: 899900,
    image: bomber,
    colors: ["ink", "navy"],
    createdAt: "2026-11-10",
    stock: 8,
  },
  {
    id: "utility-wide-trouser",
    slug: "utility-wide-trouser",
    name: "Utility Wide Trouser",
    description:
      "Easy, considered volume meets hard-wearing everyday utility in a clean dark twill.",
    category: "Trousers",
    priceCents: 499900,
    image: utilityTrousers,
    colors: ["ink", "navy"],
    createdAt: "2026-11-11",
    stock: 22,
  },
  {
    id: "form-pleated-trouser",
    slug: "form-pleated-trouser",
    name: "Form Pleated Trouser",
    description:
      "A wide straight-leg silhouette with crisp front pleats and just enough structure for every day.",
    category: "Trousers",
    priceCents: 549900,
    image: trousers,
    colors: ["ink", "cloud"],
    createdAt: "2026-11-09",
    stock: 11,
    badge: "Bestseller",
  },
  {
    id: "essential-poplin-shirt",
    slug: "essential-poplin-shirt",
    name: "Essential Poplin Shirt",
    description:
      "A precise cotton-poplin shirt with a relaxed silhouette and an easy, open collar.",
    category: "Shirts",
    priceCents: 399900,
    image: shirt,
    colors: ["cloud", "ink"],
    createdAt: "2026-11-07",
    stock: 20,
  },
  {
    id: "blue-hour-shirt",
    slug: "blue-hour-shirt",
    name: "Blue Hour Stripe Shirt",
    description:
      "Relaxed poplin, fine blue stripes. An effortless layer from a slow morning to late night.",
    category: "Shirts",
    priceCents: 429900,
    image: stripedShirt,
    colors: ["cloud", "navy"],
    createdAt: "2026-11-06",
    stock: 17,
    badge: "Bestseller",
  },
];

export const FEATURED_PRODUCTS = PRODUCTS.filter((product) => product.badge !== undefined);

// Products loaded from the database are registered here so the cart and product pages can find them.
const registry = new Map<string, Product>(PRODUCTS.map((product) => [product.slug, product]));

export function registerProducts(products: Product[]) {
  for (const product of products) registry.set(product.slug, product);
}

export function getProduct(slug: string): Product | undefined {
  return registry.get(slug);
}

export function searchProducts(
  products: Product[],
  query: string,
  category: string,
  sort: CatalogSort,
): Product[] {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = products.filter((product) => {
    const matchesCategory = category === "All pieces" || product.category === category;
    const matchesQuery =
      needle === "" ||
      `${product.name} ${product.description} ${product.category}`
        .toLocaleLowerCase()
        .includes(needle);
    return matchesCategory && matchesQuery;
  });

  switch (sort) {
    case "price-ascending":
      return filtered.sort((a, b) => a.priceCents - b.priceCents);
    case "price-descending":
      return filtered.sort((a, b) => b.priceCents - a.priceCents);
    case "newest":
      return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return filtered.sort((a, b) => PRODUCTS.indexOf(a) - PRODUCTS.indexOf(b));
  }
}
