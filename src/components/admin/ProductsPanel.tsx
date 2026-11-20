import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import {
  optimizeImageUrl,
  shrinkImage,
  supabaseStoragePath,
  validateImageUrl,
} from "@/lib/image-tools";
import { IMAGE_BY_KEY } from "@/lib/product-images";

const COLORS = ["ink", "cherry", "fern", "cloud", "navy"];
const STATUSES = ["draft", "published", "archived"];
const MAX_RAW_BYTES = 15 * 1024 * 1024;

interface Row {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  status: string;
  image_urls: string[];
  categories: { name: string } | null;
}

/** Uploads photos to Supabase after shrinking them (max 1600px WebP) so they use very little storage. */
async function uploadImages(slug: string, files: FileList | File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const original of Array.from(files)) {
    if (!original.type.startsWith("image/")) throw new Error(`${original.name} is not an image`);
    if (original.size > MAX_RAW_BYTES) throw new Error(`${original.name} is larger than 15 MB`);
    const file = await shrinkImage(original);
    const path = `${slug}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await db.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    urls.push(db.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

/** Turns lines of pasted text into checked image links; throws a readable message for the first bad one. */
function parseLinks(text: string): string[] {
  const links: string[] = [];
  for (const line of text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)) {
    const check = validateImageUrl(line);
    if (!check.ok) throw new Error(check.error);
    links.push(check.url);
  }
  return links;
}

export function ProductsPanel() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
    void qc.invalidateQueries({ queryKey: ["products"] });
  };
  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        db
          .from("products")
          .select(
            "id, slug, name, price_cents, stock_quantity, status, image_urls, categories(name)",
          )
          .order("created_at", { ascending: false }),
        db.from("categories").select("id, name").order("sort_order"),
      ]);
      if (products.error) throw products.error;
      if (categories.error) throw categories.error;
      return {
        products: products.data as unknown as Row[],
        categories: categories.data as { id: string; name: string }[],
      };
    },
  });
  const [draft, setDraft] = useState<Record<string, { price?: string; stock?: string }>>({});
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newLinks, setNewLinks] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    category_id: "",
    image_key: "core-hoodie",
    price: "",
    stock: "0",
    color: "ink",
  });

  const save = async (id: string) => {
    const d = draft[id] ?? {};
    const patch: { price_cents?: number; stock_quantity?: number } = {};
    if (d.price !== undefined) patch.price_cents = Math.round(Number(d.price) * 100);
    if (d.stock !== undefined) patch.stock_quantity = Math.floor(Number(d.stock));
    const { error } = await db.from("products").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      refresh();
    }
  };
  const setStatus = async (id: string, status: string) => {
    const { error } = await db.from("products").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this product permanently?")) return;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error)
      toast.error("Could not delete (products in past orders should be archived instead).");
    else refresh();
  };
  const saveImages = async (row: Row, urls: string[], message: string) => {
    const { error } = await db.from("products").update({ image_urls: urls }).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(message);
      refresh();
    }
  };
  const addUploads = async (row: Row, files: FileList | null) => {
    if (!files?.length) return;
    try {
      await saveImages(
        row,
        [...row.image_urls, ...(await uploadImages(row.slug, files))],
        "Photos added",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };
  const addLink = async (row: Row) => {
    try {
      const links = parseLinks(linkDraft[row.id] ?? "").filter((l) => !row.image_urls.includes(l));
      if (links.length === 0) return;
      await saveImages(row, [...row.image_urls, ...links], "Image links added");
      setLinkDraft((d) => ({ ...d, [row.id]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid link");
    }
  };
  const removeImage = async (row: Row, url: string) => {
    await saveImages(
      row,
      row.image_urls.filter((u) => u !== url),
      "Image removed",
    );
    // Free the storage space when the photo was an upload (linked images live elsewhere).
    const path = supabaseStoragePath(url);
    if (path) await db.storage.from("product-images").remove([path]);
  };
  const makeMain = (row: Row, url: string) =>
    saveImages(row, [url, ...row.image_urls.filter((u) => u !== url)], "Main photo changed");

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const linked = parseLinks(newLinks);
      const uploaded = newFiles.length ? await uploadImages(form.slug, newFiles) : [];
      const { error } = await db.from("products").insert({
        name: form.name,
        slug: form.slug,
        sku: form.sku,
        category_id: form.category_id,
        image_key: form.image_key,
        image_urls: [...linked, ...uploaded],
        price_cents: Math.round(Number(form.price) * 100),
        stock_quantity: Math.floor(Number(form.stock)),
        color_options: [form.color],
        status: "draft",
      });
      if (error) throw error;
      toast.success("Product created as draft");
      setNewFiles([]);
      setNewLinks("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create product");
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={create}
        className="grid gap-2 border border-border p-4 text-sm sm:grid-cols-4"
      >
        <Input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          required
          placeholder="slug-like-this"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <Input
          required
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <select
          required
          className="h-9 border border-input bg-background px-2"
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
        >
          <option value="">Category</option>
          {data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Fallback image"
          className="h-9 border border-input bg-background px-2"
          value={form.image_key}
          onChange={(e) => setForm({ ...form, image_key: e.target.value })}
        >
          {Object.keys(IMAGE_BY_KEY).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <Input
          required
          type="number"
          step="1"
          min="1"
          placeholder="Price (Rs)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input
          required
          type="number"
          min="0"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <select
          className="h-9 border border-input bg-background px-2"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        >
          {COLORS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="sm:col-span-4">
          Image links from Cloudinary or ImageKit (one per line, optional; saves storage)
          <textarea
            className="mt-1 min-h-16 w-full border border-input bg-background p-2 text-sm"
            value={newLinks}
            onChange={(e) => setNewLinks(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
          />
        </label>
        <label className="sm:col-span-4">
          Or upload photos (they are shrunk automatically)
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <Button type="submit" className="sm:col-span-4">
          Add product (draft)
        </Button>
      </form>
      <ul className="space-y-3">
        {data?.products.map((p) => (
          <li key={p.id} className="space-y-2 border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-48 flex-1 font-medium">
                {p.name}{" "}
                <span className="text-muted-foreground">
                  · {p.categories?.name} · {formatPrice(p.price_cents)}
                </span>
              </span>
              <Input
                className="h-8 w-28"
                type="number"
                step="1"
                aria-label="Price (Rs)"
                defaultValue={Math.round(p.price_cents / 100)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [p.id]: { ...d[p.id], price: e.target.value } }))
                }
              />
              <Input
                className="h-8 w-20"
                type="number"
                aria-label="Stock"
                defaultValue={p.stock_quantity}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [p.id]: { ...d[p.id], stock: e.target.value } }))
                }
              />
              <Button size="sm" onClick={() => void save(p.id)}>
                Save
              </Button>
              <select
                aria-label="Status"
                className="h-8 border border-input bg-background px-2"
                value={p.status}
                onChange={(e) => void setStatus(p.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <Button size="sm" variant="destructive" onClick={() => void remove(p.id)}>
                Delete
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {p.image_urls.map((url, index) => (
                <span key={url} className="relative">
                  <img src={optimizeImageUrl(url, 120)} alt="" className="size-14 object-cover" />
                  {index > 0 && (
                    <button
                      aria-label="Make main photo"
                      title="Make main photo"
                      onClick={() => void makeMain(p, url)}
                      className="absolute -left-1 -top-1 rounded-full bg-primary px-1 text-[10px] text-primary-foreground"
                    >
                      ★
                    </button>
                  )}
                  <button
                    aria-label="Remove image"
                    onClick={() => void removeImage(p, url)}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-[10px] text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              <label className="cursor-pointer text-xs underline">
                Upload photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => void addUploads(p, e.target.files)}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Input
                className="h-8"
                aria-label="Paste image link"
                placeholder="Paste Cloudinary / ImageKit link"
                value={linkDraft[p.id] ?? ""}
                onChange={(e) => setLinkDraft((d) => ({ ...d, [p.id]: e.target.value }))}
              />
              <Button size="sm" variant="outline" onClick={() => void addLink(p)}>
                Add link
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
