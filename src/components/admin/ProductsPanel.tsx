import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { IMAGE_BY_KEY } from "@/lib/product-images";

const COLORS = ["ink", "cherry", "fern", "cloud", "navy"];
const STATUSES = ["draft", "published", "archived"];

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
        supabase
          .from("products")
          .select("id, slug, name, price_cents, stock_quantity, status, categories(name)")
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name").order("sort_order"),
      ]);
      if (products.error) throw products.error;
      if (categories.error) throw categories.error;
      return { products: products.data, categories: categories.data };
    },
  });
  const [draft, setDraft] = useState<Record<string, { price?: string; stock?: string }>>({});
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
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      refresh();
    }
  };
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error)
      toast.error("Could not delete (products in past orders should be archived instead).");
    else refresh();
  };
  const create = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({
      name: form.name,
      slug: form.slug,
      sku: form.sku,
      category_id: form.category_id,
      image_key: form.image_key,
      price_cents: Math.round(Number(form.price) * 100),
      stock_quantity: Math.floor(Number(form.stock)),
      color_options: [form.color],
      status: "draft",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Product created as draft");
      refresh();
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
          step="0.01"
          min="0.01"
          placeholder="Price (USD)"
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
        <Button type="submit" className="sm:col-span-4">
          Add product (draft)
        </Button>
      </form>
      <ul className="space-y-3">
        {data?.products.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-2 border border-border p-3 text-sm"
          >
            <span className="min-w-48 flex-1 font-medium">
              {p.name}{" "}
              <span className="text-muted-foreground">
                · {(p.categories as { name: string } | null)?.name} · {formatPrice(p.price_cents)}
              </span>
            </span>
            <Input
              className="h-8 w-24"
              type="number"
              step="0.01"
              aria-label="Price"
              defaultValue={(p.price_cents / 100).toFixed(2)}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
