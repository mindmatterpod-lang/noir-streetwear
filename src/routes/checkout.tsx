import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { PROVINCES } from "@/lib/provinces";
import { useAuth } from "@/hooks/use-auth";
import { readProfile } from "@/hooks/use-profile";
import { events } from "@/lib/analytics";
import { EmptyBag } from "@/components/cart/EmptyBag";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ShippingNote } from "@/components/shop/ShippingNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { computeTotals } from "@/lib/pricing";
import { optimizeImageUrl } from "@/lib/image-tools";
import { useStoreSettings } from "@/lib/store-settings";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES } from "@/types/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: Checkout,
});

const DRAFT_KEY = "nowhere-checkout-v1";

type Form = Record<string, string>;

/** Friendly client-side checks. The server validates everything again and is the authority. */
function validate(form: Form): Form {
  const e: Form = {};
  const v = (k: string) => (form[k] ?? "").trim();
  if (v("name").length < 2) e["name"] = "Enter your full name.";
  const digits = v("phone").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13)
    e["phone"] = "Enter a valid mobile number, e.g. 0300 1234567.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) e["email"] = "Enter a valid email address.";
  if (v("address").length < 5) e["address"] = "Enter your house, street and area.";
  if (v("city").length < 2) e["city"] = "Enter your city.";
  if (!(PROVINCES as readonly string[]).includes(v("province")))
    e["province"] = "Select your province.";
  return e;
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="border-t border-border pt-8">
      <h2 id={`step-${n}`} className="flex items-baseline gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">0{n}</span>
        <span className="display-heading text-3xl">{title}</span>
      </h2>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: (props: Record<string, string | boolean | undefined>) => ReactNode;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-[0.14em]">
        {label}
      </Label>
      <div className="mt-2">
        {children({
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Checkout() {
  const { items, subtotalCents, clearCart } = useCart();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const { user } = useAuth();
  const profile = readProfile(user);
  const prefilled = useRef(false);
  const { data: config } = useQuery({
    queryKey: ["api-config"],
    staleTime: 300_000,
    queryFn: async () => (await fetch("/api/config")).json() as Promise<{ card: boolean }>,
  });
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [form, setForm] = useState<Form>({});
  const [errors, setErrors] = useState<Form>({});
  const [method, setMethod] = useState<"cod" | "card">("cod");
  const [codeInput, setCodeInput] = useState("");
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [applied, setApplied] = useState<{ code: string; cents: number } | null>(null);

  // Keep what the customer typed if they leave and come back (this tab only; cleared after the order).
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? "null");
      if (saved && typeof saved === "object") setForm(saved as Form);
    } catch {
      // No saved draft.
    }
  }, []);
  // Signed-in customers start with their saved details (never overwriting anything already typed).
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    const first = profile.addresses[0];
    setForm((prev) => ({
      name: profile.name,
      phone: profile.phone,
      email: user.email ?? "",
      ...(first
        ? {
            address: first.address,
            city: first.city,
            province: first.province,
            postal_code: first.postal_code,
          }
        : {}),
      ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const startedCheckout = useRef(false);
  useEffect(() => {
    if (startedCheckout.current || items.length === 0) return;
    startedCheckout.current = true;
    events.beginCheckout(items.length, subtotalCents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  const setField = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // Draft saving is optional.
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

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
    setCodeMessage(null);
    const { data, error } = await db.rpc("preview_discount", {
      p_code: codeInput,
      p_subtotal: subtotalCents,
    });
    if (error) {
      setApplied(null);
      setCodeMessage({ ok: false, text: error.message.replace(/^.*?:\s*/, "") });
      return;
    }
    setApplied({ code: codeInput.trim().toUpperCase(), cents: data as number });
    setCodeMessage({
      ok: true,
      text: "Code applied. The final amount is confirmed when you place the order.",
    });
  };
  const removeCode = () => {
    setApplied(null);
    setCodeInput("");
    setCodeMessage(null);
  };

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const found = validate(form);
    setErrors(found);
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      document.getElementById(firstBad)?.focus();
      return;
    }
    submitting.current = true;
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
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to clear.
      }
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
      submitting.current = false;
      setBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="page-container">
          <EmptyBag />
        </div>
      </SiteLayout>
    );
  }

  const input = "h-12";
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <SiteLayout>
      <form
        onSubmit={placeOrder}
        noValidate
        className="page-container grid max-w-6xl gap-12 py-10 md:py-14 lg:grid-cols-[1fr_420px]"
      >
        <div className="min-w-0 space-y-10">
          <header>
            <h1 className="display-heading text-[clamp(2.75rem,10vw,5.5rem)]">Checkout</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              No account needed.{" "}
              <Link to="/login" search={{ redirect: "/checkout" }} className="underline">
                Sign in
              </Link>{" "}
              to save your order history.
            </p>
          </header>
          {errorCount > 0 && (
            <p role="alert" className="border border-destructive p-3 text-sm text-destructive">
              Please fix {errorCount} {errorCount === 1 ? "field" : "fields"} below.
            </p>
          )}

          <Section n={1} title="Customer details">
            <Field id="name" label="Full name" error={errors["name"]}>
              {(p) => (
                <Input
                  {...p}
                  className={input}
                  autoComplete="name"
                  value={form["name"] ?? ""}
                  onChange={(e) => setField("name", e.target.value)}
                />
              )}
            </Field>
            <Field
              id="phone"
              label="Mobile number"
              error={errors["phone"]}
              hint="The courier may call this number to confirm delivery."
            >
              {(p) => (
                <Input
                  {...p}
                  className={input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0300 1234567"
                  value={form["phone"] ?? ""}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              )}
            </Field>
            <Field id="email" label="Email (for your order updates)" error={errors["email"]}>
              {(p) => (
                <Input
                  {...p}
                  className={input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form["email"] ?? ""}
                  onChange={(e) => setField("email", e.target.value)}
                />
              )}
            </Field>
          </Section>

          <Section n={2} title="Delivery address">
            {profile.addresses.length > 0 && (
              <div>
                <Label htmlFor="saved-address" className="text-xs uppercase tracking-[0.14em]">
                  Saved addresses
                </Label>
                <select
                  id="saved-address"
                  defaultValue=""
                  onChange={(e) => {
                    const a = profile.addresses.find((x) => x.id === e.target.value);
                    if (!a) return;
                    setField("address", a.address);
                    setField("city", a.city);
                    setField("province", a.province);
                    setField("postal_code", a.postal_code);
                  }}
                  className="mt-2 h-12 w-full border border-input bg-background px-3 text-sm"
                >
                  <option value="">Use a saved address</option>
                  {profile.addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label || a.address}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Field id="address" label="Address (house, street, area)" error={errors["address"]}>
              {(p) => (
                <Input
                  {...p}
                  className={input}
                  autoComplete="street-address"
                  value={form["address"] ?? ""}
                  onChange={(e) => setField("address", e.target.value)}
                />
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="city" label="City" error={errors["city"]}>
                {(p) => (
                  <Input
                    {...p}
                    className={input}
                    autoComplete="address-level2"
                    value={form["city"] ?? ""}
                    onChange={(e) => setField("city", e.target.value)}
                  />
                )}
              </Field>
              <Field id="postal_code" label="Postal code (optional)">
                {(p) => (
                  <Input
                    {...p}
                    className={input}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form["postal_code"] ?? ""}
                    onChange={(e) => setField("postal_code", e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field id="province" label="Province" error={errors["province"]}>
              {(p) => (
                <select
                  {...p}
                  value={form["province"] ?? ""}
                  onChange={(e) => setField("province", e.target.value)}
                  className="h-12 w-full border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((prov) => (
                    <option key={prov}>{prov}</option>
                  ))}
                </select>
              )}
            </Field>
          </Section>

          <Section n={3} title="Payment">
            <fieldset className="space-y-3">
              <legend className="sr-only">Payment method</legend>
              {codAllowed && (
                <label
                  className={`flex min-h-14 cursor-pointer items-start gap-3 border p-4 text-sm ${effectiveMethod === "cod" ? "border-primary" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    className="mt-0.5 size-4 accent-[var(--color-primary)]"
                    checked={effectiveMethod === "cod"}
                    onChange={() => setMethod("cod")}
                  />
                  <span>
                    <span className="font-medium">Cash on delivery</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Pay the courier in cash when your parcel arrives.
                    </span>
                  </span>
                </label>
              )}
              {cardAllowed && (
                <label
                  className={`flex min-h-14 cursor-pointer items-start gap-3 border p-4 text-sm ${effectiveMethod === "card" ? "border-primary" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    className="mt-0.5 size-4 accent-[var(--color-primary)]"
                    checked={effectiveMethod === "card"}
                    onChange={() => setMethod("card")}
                  />
                  <span>
                    <span className="font-medium">Credit / debit card</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      You will enter your card details on Stripe&rsquo;s secure payment page.
                    </span>
                  </span>
                </label>
              )}
              {!codAllowed && !cardAllowed && (
                <p className="text-sm text-destructive">
                  No payment method is available right now. Please contact us.
                </p>
              )}
            </fieldset>
          </Section>
        </div>

        <aside className="h-fit min-w-0 space-y-6 border border-border p-6 lg:sticky lg:top-24">
          <h2 className="flex items-baseline gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">04</span>
            <span className="display-heading text-3xl">Order review</span>
          </h2>
          <ul className="divide-y divide-border">
            {items.map((i) => {
              const p = getProduct(i.productId);
              return p ? (
                <li key={`${i.productId}${i.size}${i.color}`} className="flex gap-3 py-4 text-sm">
                  <img
                    src={optimizeImageUrl(p.image, 160)}
                    alt=""
                    width={64}
                    height={80}
                    loading="lazy"
                    className="h-20 w-16 shrink-0 bg-card object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium uppercase leading-snug tracking-[0.06em]">
                      {p.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Size {i.size} · {COLOR_NAMES[i.color]} · Qty {i.quantity}
                    </p>
                  </div>
                  <span className="tabular-nums">{formatPrice(p.priceCents * i.quantity)}</span>
                </li>
              ) : null;
            })}
          </ul>
          <div>
            {applied ? (
              <div className="flex items-center justify-between gap-3 border border-border p-3 text-sm">
                <span>
                  Code <strong>{applied.code}</strong> applied
                </span>
                <button
                  type="button"
                  onClick={removeCode}
                  className="min-h-11 text-xs uppercase tracking-[0.14em] underline underline-offset-4"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  aria-label="Discount code"
                  placeholder="Discount code"
                  className="h-11"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (codeInput.trim()) void applyCode();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={!codeInput.trim()}
                  onClick={() => void applyCode()}
                >
                  Apply
                </Button>
              </div>
            )}
            {codeMessage && (
              <p
                role={codeMessage.ok ? "status" : "alert"}
                className={`mt-2 text-xs ${codeMessage.ok ? "text-muted-foreground" : "text-destructive"}`}
              >
                {codeMessage.text}
              </p>
            )}
          </div>
          <div className="space-y-2 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount ({applied?.code})</span>
                <span className="tabular-nums">−{formatPrice(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="tabular-nums">
                {totals.shipping ? formatPrice(totals.shipping) : "Free"}
              </span>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="tabular-nums">{formatPrice(totals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(totals.total)}</span>
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full text-xs uppercase tracking-[0.22em]"
            disabled={busy || (!codAllowed && !cardAllowed)}
          >
            {busy
              ? "Please wait…"
              : effectiveMethod === "card"
                ? `Pay ${formatPrice(totals.total)}`
                : `Place order · ${formatPrice(totals.total)}`}
          </Button>
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <ShippingNote className="text-xs text-muted-foreground" />
            <p>
              After you order, you&rsquo;ll get an order page showing its status and tracking number
              once it ships.{" "}
              <Link
                to="/policies/$slug"
                params={{ slug: "shipping-returns" }}
                className="underline underline-offset-4"
              >
                Delivery &amp; returns
              </Link>
            </p>
          </div>
        </aside>
      </form>
    </SiteLayout>
  );
}
