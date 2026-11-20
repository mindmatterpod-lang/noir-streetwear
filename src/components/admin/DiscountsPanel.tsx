import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

interface Code {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
}

export function DiscountsPanel() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-discounts"] });
  const { data: codes = [] } = useQuery({
    queryKey: ["admin-discounts"],
    queryFn: async () => {
      const { data, error } = await db
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Code[];
    },
  });
  const [form, setForm] = useState({
    code: "",
    kind: "percent",
    value: "",
    min: "0",
    max: "",
    expires: "",
  });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(form.value);
    const { error } = await db.from("discount_codes").insert({
      code: form.code.trim().toUpperCase(),
      percent_off: form.kind === "percent" ? Math.floor(value) : null,
      amount_off_cents: form.kind === "amount" ? Math.round(value * 100) : null,
      min_subtotal_cents: Math.round(Number(form.min || "0") * 100),
      max_uses: form.max ? Math.floor(Number(form.max)) : null,
      expires_at: form.expires ? new Date(form.expires).toISOString() : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Code created");
      refresh();
    }
  };
  const toggle = async (c: Code) => {
    const { error } = await db.from("discount_codes").update({ active: !c.active }).eq("id", c.id);
    if (error) toast.error(error.message);
    else refresh();
  };
  const remove = async (c: Code) => {
    if (!window.confirm(`Delete ${c.code}?`)) return;
    const { error } = await db.from("discount_codes").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="grid gap-2 border border-border p-4 text-sm sm:grid-cols-3"
      >
        <Input
          required
          placeholder="CODE"
          pattern="[A-Za-z0-9_-]{3,32}"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <select
          className="h-9 border border-input bg-background px-2"
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          <option value="percent">Percent off</option>
          <option value="amount">Fixed amount off (Rs)</option>
        </select>
        <Input
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder={form.kind === "percent" ? "Percent (1–100)" : "Amount (Rs)"}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Minimum order (Rs)"
          value={form.min}
          onChange={(e) => setForm({ ...form, min: e.target.value })}
        />
        <Input
          type="number"
          min="1"
          placeholder="Max uses (blank = unlimited)"
          value={form.max}
          onChange={(e) => setForm({ ...form, max: e.target.value })}
        />
        <Input
          type="date"
          aria-label="Expires"
          value={form.expires}
          onChange={(e) => setForm({ ...form, expires: e.target.value })}
        />
        <Button type="submit" className="sm:col-span-3">
          Create code
        </Button>
      </form>
      <ul className="space-y-2">
        {codes.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 border border-border p-3 text-sm"
          >
            <span className="font-mono font-medium">{c.code}</span>
            <span>
              {c.percent_off
                ? `${c.percent_off}% off`
                : `${formatPrice(c.amount_off_cents ?? 0)} off`}
            </span>
            <span className="text-muted-foreground">
              used {c.used_count}
              {c.max_uses ? `/${c.max_uses}` : ""}
              {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
            </span>
            <span className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => void toggle(c)}>
              {c.active ? "Disable" : "Enable"}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void remove(c)}>
              Delete
            </Button>
          </li>
        ))}
        {codes.length === 0 && <p className="text-muted-foreground">No discount codes yet.</p>}
      </ul>
    </div>
  );
}
