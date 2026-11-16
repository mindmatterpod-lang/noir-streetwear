import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES } from "@/types/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — Noir Streetwear" }, { name: "robots", content: "noindex" }],
  }),
  component: Checkout,
});

const FIELDS = [
  { key: "shipping_name", label: "Full name", autoComplete: "name" },
  { key: "shipping_email", label: "Email", autoComplete: "email", type: "email" },
  { key: "shipping_address", label: "Address", autoComplete: "street-address" },
  { key: "shipping_city", label: "City", autoComplete: "address-level2" },
  { key: "shipping_postal_code", label: "Postal code", autoComplete: "postal-code" },
  { key: "shipping_country", label: "Country", autoComplete: "country-name" },
] as const;

function Checkout() {
  const { items, subtotalCents, clearCart } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const field = (key: string) => form[key] ?? "";

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      // Cart lines are keyed by slug; the database needs product uuids, and re-prices every line itself.
      const merged = new Map<
        string,
        { product_id: string; size: string; color: string; quantity: number }
      >();
      const { data: rows, error: lookupError } = await supabase
        .from("products")
        .select("id, slug")
        .in(
          "slug",
          items.map((i) => i.productId),
        );
      if (lookupError) throw lookupError;
      for (const item of items) {
        const id = rows?.find((r) => r.slug === item.productId)?.id;
        if (!id) throw new Error("An item in your bag is no longer available.");
        if (merged.has(id))
          throw new Error(
            "Each piece can only appear once per order — adjust the size or colour lines in your bag.",
          );
        merged.set(id, {
          product_id: id,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        });
      }
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        shipping_name: field("shipping_name"),
        shipping_email: field("shipping_email"),
        shipping_address: field("shipping_address"),
        shipping_city: field("shipping_city"),
        shipping_postal_code: field("shipping_postal_code"),
        shipping_country: field("shipping_country"),
        subtotal_cents: subtotalCents,
        total_cents: subtotalCents,
        checkout_items: [...merged.values()],
      });
      if (error) throw error;
      clearCart();
      toast.success("Order placed. We'll update its status as it progresses.");
      await navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place your order");
    } finally {
      setBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="py-24 text-center">
          <p>Your bag is empty.</p>
          <Link
            to="/shop"
            search={{ category: "All pieces" }}
            className="mt-4 inline-block underline"
          >
            Continue shopping
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest">Checkout</h1>
          {loading ? null : !user ? (
            <div className="mt-8 border border-border p-6">
              <p className="text-sm">
                Sign in or create an account to place your order and track it afterwards.
              </p>
              <Button asChild className="mt-4">
                <Link to="/login" search={{ redirect: "/checkout" }}>
                  Sign in to continue
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={placeOrder} className="mt-8 space-y-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    required
                    autoComplete={f.autoComplete}
                    type={"type" in f ? f.type : "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Payments are not connected yet: placing an order records it for fulfilment and no
                card is charged.
              </p>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Placing order…" : `Place order · ${formatPrice(subtotalCents)}`}
              </Button>
            </form>
          )}
        </div>
        <aside className="h-fit border border-border p-6">
          <h2 className="text-sm uppercase tracking-widest">Summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => {
              const p = getProduct(i.productId);
              return p ? (
                <li key={`${i.productId}${i.size}${i.color}`} className="flex justify-between">
                  <span>
                    {p.name} · {i.size} · {COLOR_NAMES[i.color]} × {i.quantity}
                  </span>
                  <span>{formatPrice(p.priceCents * i.quantity)}</span>
                </li>
              ) : null;
            })}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
