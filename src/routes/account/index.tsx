import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/account/RequireAuth";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ADDRESSES, readProfile, updateProfile, type SavedAddress } from "@/hooks/use-profile";
import { useWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { orderNumber, STATUS_LABEL } from "@/lib/order-status";
import { PROVINCES } from "@/lib/provinces";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [{ title: "Your account — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth redirect="/account">{(user) => <Dashboard userId={user.id} />}</RequireAuth>
  ),
});

const card = "border border-border p-6";
const heading = "text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground";

function Dashboard({ userId }: { userId: string }) {
  const { user, signOut } = useAuth();
  const profile = readProfile(user);
  const { slugs } = useWishlist();
  const { data: recent } = useQuery({
    queryKey: ["recent-order", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_cents, created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const displayName = profile.name || user?.email?.split("@")[0] || "";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-heading text-[clamp(2.75rem,10vw,5.5rem)]">Welcome back.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {displayName}
            {user?.email && displayName !== user.email ? ` · ${user.email}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          className="uppercase tracking-[0.16em]"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className={card} aria-labelledby="recent-heading">
          <h2 id="recent-heading" className={heading}>
            Recent order
          </h2>
          {recent ? (
            <div className="mt-4">
              <p className="text-lg tabular-nums">{orderNumber(recent.id)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {STATUS_LABEL[recent.status] ?? recent.status} · {formatPrice(recent.total_cents)}
              </p>
              <Link
                to="/account/orders/$id"
                params={{ id: recent.id }}
                className="mt-4 inline-block py-2 text-xs uppercase tracking-[0.16em] underline underline-offset-4"
              >
                Track this order
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              You haven&rsquo;t placed an order yet.
            </p>
          )}
        </section>

        <section className={card} aria-labelledby="shortcuts-heading">
          <h2 id="shortcuts-heading" className={heading}>
            Shortcuts
          </h2>
          <ul className="mt-4 space-y-1 text-sm">
            <li>
              <Link to="/account/orders" className="inline-block py-2 underline underline-offset-4">
                Order history
              </Link>
            </li>
            <li>
              <Link to="/wishlist" className="inline-block py-2 underline underline-offset-4">
                Saved for later ({slugs.length})
              </Link>
            </li>
            <li>
              <Link to="/track" className="inline-block py-2 underline underline-offset-4">
                Track another order
              </Link>
            </li>
          </ul>
        </section>

        <ProfileForm
          initialName={profile.name}
          initialPhone={profile.phone}
          email={user?.email ?? ""}
        />
        <Addresses addresses={profile.addresses} />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <WhatsAppButton label="Contact support" />
        <Link
          to="/policies/$slug"
          params={{ slug: "contact" }}
          className="underline underline-offset-4"
        >
          Delete my account or request my data
        </Link>
      </div>
    </div>
  );
}

function ProfileForm({
  initialName,
  initialPhone,
  email,
}: {
  initialName: string;
  initialPhone: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (phone && phone.replace(/\D/g, "").length < 10)
      return void toast.error("Enter a valid mobile number.");
    setBusy(true);
    try {
      await updateProfile({ name, phone });
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={card} aria-labelledby="profile-heading">
      <h2 id="profile-heading" className={heading}>
        Account details
      </h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="p-email" className="text-xs uppercase tracking-[0.14em]">
            Email
          </Label>
          <Input id="p-email" value={email} readOnly className="mt-2 h-11 opacity-70" />
        </div>
        <div>
          <Label htmlFor="p-name" className="text-xs uppercase tracking-[0.14em]">
            Full name
          </Label>
          <Input
            id="p-name"
            autoComplete="name"
            className="mt-2 h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-phone" className="text-xs uppercase tracking-[0.14em]">
            Mobile number
          </Label>
          <Input
            id="p-phone"
            type="tel"
            autoComplete="tel"
            className="mt-2 h-11"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy} className="h-11 uppercase tracking-[0.16em]">
          {busy ? "Saving…" : "Save"}
        </Button>
      </form>
    </section>
  );
}

function Addresses({ addresses }: { addresses: SavedAddress[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    label: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const persist = async (next: SavedAddress[]) => {
    setBusy(true);
    try {
      await updateProfile({ addresses: next });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (draft.address.trim().length < 5 || draft.city.trim().length < 2 || !draft.province)
      return void toast.error("Enter your address, city and province.");
    const entry: SavedAddress = { ...draft, id: crypto.randomUUID() };
    if (await persist([...addresses, entry])) {
      setAdding(false);
      setDraft({ label: "", address: "", city: "", province: "", postal_code: "" });
      toast.success("Address saved.");
    }
  };
  return (
    <section className={card} aria-labelledby="addr-heading">
      <h2 id="addr-heading" className={heading}>
        Saved addresses
      </h2>
      {addresses.length === 0 && !adding && (
        <p className="mt-4 text-sm text-muted-foreground">No saved addresses yet.</p>
      )}
      <ul className="mt-4 space-y-4">
        {addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
            <span>
              {a.label && <strong className="block">{a.label}</strong>}
              {a.address}, {a.city}
              {a.postal_code ? ` ${a.postal_code}` : ""}
              <span className="block text-muted-foreground">{a.province}</span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist(addresses.filter((x) => x.id !== a.id))}
              aria-label={`Remove address ${a.label || a.address}`}
              className="min-h-11 shrink-0 text-xs uppercase tracking-[0.14em] underline underline-offset-4"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} className="mt-4 space-y-3">
          <Input
            aria-label="Label (e.g. Home)"
            placeholder="Label (e.g. Home)"
            className="h-11"
            value={draft.label}
            onChange={(e) => set("label", e.target.value)}
          />
          <Input
            aria-label="Address"
            placeholder="House, street, area"
            required
            className="h-11"
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              aria-label="City"
              placeholder="City"
              required
              className="h-11"
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <Input
              aria-label="Postal code"
              placeholder="Postal code"
              className="h-11"
              value={draft.postal_code}
              onChange={(e) => set("postal_code", e.target.value)}
            />
          </div>
          <select
            aria-label="Province"
            required
            value={draft.province}
            onChange={(e) => set("province", e.target.value)}
            className="h-11 w-full border border-input bg-background px-3 text-sm"
          >
            <option value="">Province</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy} className="h-11 uppercase tracking-[0.16em]">
              Save address
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 uppercase tracking-[0.16em]"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        addresses.length < MAX_ADDRESSES && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 min-h-11 text-xs uppercase tracking-[0.16em] underline underline-offset-4"
          >
            Add an address
          </button>
        )
      )}
    </section>
  );
}
