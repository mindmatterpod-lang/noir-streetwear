import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";
import { PRODUCTS, getProduct as getLocalProduct, registerProducts } from "@/lib/store-catalog";
import { ALTERNATE_BY_KEY, IMAGE_BY_KEY } from "@/lib/product-images";
import type { Category, Product, ProductColor } from "@/types/store";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_key: string;
  image_urls: string[] | null;
  color_options: string[];
  price_cents: number;
  stock_quantity: number;
  is_featured: boolean;
  created_at: string;
  categories: { name: string } | null;
}

function optional<K extends string>(key: K, value: string | undefined): { [P in K]?: string } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: string });
}

/** Loads published products from Supabase; falls back to the local lookbook if the request fails. */
export async function fetchProducts(): Promise<Product[]> {
  const { data: rawRows, error } = await db
    .from("products")
    .select(
      "id, slug, name, description, image_key, image_urls, color_options, price_cents, stock_quantity, is_featured, created_at, categories(name)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const data = rawRows as unknown as ProductRow[] | null;
  if (error || !data || data.length === 0) return PRODUCTS;
  const mapped = data.map((row) => {
    const uploaded = row.image_urls ?? [];
    const local = getLocalProduct(row.slug);
    return {
      id: row.slug,
      dbId: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || local?.description || "",
      category: (row.categories?.name ?? local?.category ?? "Hoodies") as Category,
      priceCents: row.price_cents,
      image: uploaded[0] ?? IMAGE_BY_KEY[row.image_key] ?? local?.image ?? "",
      ...(uploaded.length > 0 ? { images: uploaded } : {}),
      ...optional(
        "alternateImage",
        uploaded[1] ?? ALTERNATE_BY_KEY[row.image_key] ?? local?.alternateImage,
      ),
      colors: row.color_options as ProductColor[],
      createdAt: row.created_at.slice(0, 10),
      stock: row.stock_quantity,
      ...optional("badge", local?.badge ?? (row.is_featured ? "Featured" : undefined)),
    } satisfies Product;
  });
  registerProducts(mapped);
  return mapped;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 60_000,
    placeholderData: PRODUCTS,
  });
}
