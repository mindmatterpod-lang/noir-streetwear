import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { computeTotals } from "@/lib/pricing";
import { useStoreSettings } from "@/lib/store-settings";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES } from "@/types/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — Noir Streetwear" }, { name: "robots", content: "noindex" }],
  }),
  component: Checkout,
});

const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu & Kashmir",
] as const;

const FIELDS = [
  { key: "name", label: "Full name", autoComplete: "name" },
  { key: "email", label: "Email (for your order updates)", autoComplete: "email", type: "email" },
  {
    key: "phone",
    label: "Mobile number",
    autoComplete: "tel",
    type: "tel",
    placeholder: "0300 1234567",
  },
  { key: "address", label: "Full address (house, street, area)", autoComplete: "street-address" },
  { key: "city", label: "City", autoComplete: "address-level2" },
] as const;

function Checkout() {
  const { items, subtotalCents, clearCart } = useCart();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const { data: config } = useQuery({
    queryKey: ["api-config"],
    staleTime: 300_000,
    queryFn: async () => (await fetch("/api/config")).json() as Promise<{ card: boolean }>,
  });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<"cod" | "card">("cod");
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; cents: number } | null>(null);

  const codAllowed = settings?.cod_enabled ?? true;
  const cardAllowed = config?.card ?? false;
  const effectiveMethod = method === "cod" && !codAllowed && cardAllowed ? "card" : method;
  const totals = computeTotals(
    subtotalCents,
    applied?.cents ?? 0,
    settings ?? {
      shipping_flat_cents: 25000,
      free_shipping_threshold_cents: 750000,
      tax_rate_bps: 0,
      cod_enabled: true,
    },
  );

  const applyCode = async () => {
    const { data, error } = await db.rpc("preview_discount", {
      p_code: codeInput,
      p_subtotal: subtotalCents,
    });
    if (error) {
      setApplied(null);
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    setApplied({ code: codeInput.trim().toUpperCase(), cents: data as number });
    toast.success("Discount applied");
  };

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session.session ? { authorization: `Bearer ${session.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.productId,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          })),
          customer: {
            name: form["name"] ?? "",
            email: form["email"] ?? "",
            phone: form["phone"] ?? "",
            address: form["address"] ?? "",
            city: form["city"] ?? "",
            province: form["province"] ?? "",
            postal_code: form["postal_code"] ?? "",
          },
          code: applied?.code ?? null,
          method: effectiveMethod,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        url?: string;
        orderId?: string;
        token?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Could not place your order");
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      clearCart();
      await navigate({
        to: "/order/$id",
        params: { id: result.orderId ?? "" },
        search: { token: result.token ?? "" },
      });
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
          <Link to="/shop" search={{}} className="mt-4 inline-block underline">
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
          <p className="mt-2 text-sm text-muted-foreground">
            No account needed.{" "}
            <Link to="/login" search={{ redirect: "/checkout" }} className="underline">
              Sign in
            </Link>{" "}
            to save your order history.
          </p>
          <form onSubmit={placeOrder} className="mt-8 space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  required
                  autoComplete={f.autoComplete}
                  placeholder={"placeholder" in f ? f.placeholder : undefined}
                  type={"type" in f ? f.type : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="province">Province</Label>
              <select
                id="province"
                required
                value={form["province"] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                className="h-9 w-full border border-input bg-background px-3 text-sm"
              >
                <option value="">Select province</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="postal_code">Postal code (optional)</Label>
              <Input
                id="postal_code"
                autoComplete="postal-code"
                value={form["postal_code"] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
              />
            </div>
            <fieldset className="space-y-2 border border-border p-4">
              <legend className="px-1 text-xs uppercase tracking-widest">Payment</legend>
              {codAllowed && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pay"
                    checked={effectiveMethod === "cod"}
                    onChange={() => setMethod("cod")}
                  />{" "}
                  Cash on delivery
                </label>
              )}
              {cardAllowed && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pay"
                    checked={effectiveMethod === "card"}
                    onChange={() => setMethod("card")}
                  />{" "}
                  Credit / debit card (secure checkout)
                </label>
              )}
              {!codAllowed && !cardAllowed && (
                <p className="text-sm text-destructive">
                  No payment method is available right now. Please contact us.
                </p>
              )}
            </fieldset>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || (!codAllowed && !cardAllowed)}
            >
              {busy
                ? "Please wait…"
                : effectiveMethod === "card"
                  ? `Pay ${formatPrice(totals.total)}`
                  : `Place order · ${formatPrice(totals.total)}`}
            </Button>
          </form>
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
          <div className="mt-4 flex gap-2">
            <Input
              aria-label="Discount code"
              placeholder="Discount code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!codeInput.trim()}
              onClick={() => void applyCode()}
            >
              Apply
            </Button>
          </div>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount ({applied?.code})</span>
                <span>−{formatPrice(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{totals.shipping ? formatPrice(totals.shipping) : "Free"}</span>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPrice(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatPrice(totals.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
