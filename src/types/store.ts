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
