import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCTS, getProduct as getLocalProduct } from "@/lib/store-catalog";
import { ALTERNATE_BY_KEY, IMAGE_BY_KEY } from "@/lib/product-images";
import type { Category, Product, ProductColor } from "@/types/store";

function optional<K extends string>(key: K, value: string | undefined): { [P in K]?: string } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: string });
}

/** Loads published products from Supabase; falls back to the local lookbook if the request fails. */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, image_key, color_options, price_cents, stock_quantity, is_featured, created_at, categories(name)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return PRODUCTS;
  return data.map((row) => {
    const local = getLocalProduct(row.slug);
    return {
      id: row.slug,
      dbId: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || local?.description || "",
      category: ((row.categories as { name: string } | null)?.name ??
        local?.category ??
        "Hoodies") as Category,
      priceCents: row.price_cents,
      image: IMAGE_BY_KEY[row.image_key] ?? local?.image ?? "",
      ...optional("alternateImage", ALTERNATE_BY_KEY[row.image_key] ?? local?.alternateImage),
      colors: row.color_options as ProductColor[],
      createdAt: row.created_at.slice(0, 10),
      stock: row.stock_quantity,
      ...optional("badge", local?.badge ?? (row.is_featured ? "Featured" : undefined)),
    } satisfies Product;
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 60_000,
    placeholderData: PRODUCTS,
  });
}
