export const CORE_CATEGORIES = ["Hoodies", "Tracksuits", "Jackets", "Trousers", "Shirts"] as const;

export type Category = (typeof CORE_CATEGORIES)[number];
export type ProductColor = "ink" | "cherry" | "fern" | "cloud" | "navy";
export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";

export const PRODUCT_SIZES: ProductSize[] = ["S", "M", "L", "XL", "XXL"];

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  image: string;
  alternateImage?: string;
  colors: ProductColor[];
  createdAt: string;
  stock: number;
  badge?: string;
  /** Supabase product uuid, present when loaded from the database. */
  dbId?: string;
  /** Gallery images (uploaded by admins); falls back to image + alternateImage. */
  images?: string[];
}

export interface CartItem {
  productId: string;
  size: ProductSize;
  color: ProductColor;
  quantity: number;
}

export type CatalogSort = "featured" | "price-ascending" | "price-descending" | "newest";

export const COLOR_NAMES: Record<ProductColor, string> = {
  ink: "Ink",
  cherry: "Cherry",
  fern: "Fern",
  cloud: "Cloud",
  navy: "Midnight",
};

/** Swatch colours shown on product cards and the product page. */
export const COLOR_SWATCH: Record<ProductColor, string> = {
  ink: "#16181d",
  cherry: "#9b1b30",
  fern: "#3f5b45",
  cloud: "#e9e7e2",
  navy: "#1b2a4a",
};
