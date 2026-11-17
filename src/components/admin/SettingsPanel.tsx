import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { useStoreSettings } from "@/lib/store-settings";

export function SettingsPanel() {
  const qc = useQueryClient();
  const { data } = useStoreSettings();
  const [f, setF] = useState({ shipping: "8.00", threshold: "150.00", tax: "0", cod: true });
  useEffect(() => {
    if (!data) return;
    setF({
      shipping: (data.shipping_flat_cents / 100).toFixed(2),
      threshold:
        data.free_shipping_threshold_cents === null
          ? ""
          : (data.free_shipping_threshold_cents / 100).toFixed(2),
      tax: String(data.tax_rate_bps / 100),
      cod: data.cod_enabled,
    });
  }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await db
      .from("store_settings")
      .update({
        shipping_flat_cents: Math.round(Number(f.shipping) * 100),
        free_shipping_threshold_cents:
          f.threshold === "" ? null : Math.round(Number(f.threshold) * 100),
        tax_rate_bps: Math.round(Number(f.tax) * 100),
        cod_enabled: f.cod,
      })
      .eq("id", true);
    if (error) toast.error(error.message);
    else {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["store-settings"] });
    }
  };

  return (
    <form onSubmit={save} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="ship">Flat shipping rate (USD)</Label>
        <Input
          id="ship"
          type="number"
          min="0"
          step="0.01"
          value={f.shipping}
          onChange={(e) => setF({ ...f, shipping: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="free">Free shipping from (USD, blank = never)</Label>
        <Input
          id="free"
          type="number"
          min="0"
          step="0.01"
          value={f.threshold}
          onChange={(e) => setF({ ...f, threshold: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="tax">Tax rate (%)</Label>
        <Input
          id="tax"
          type="number"
          min="0"
          max="50"
          step="0.01"
          value={f.tax}
          onChange={(e) => setF({ ...f, tax: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.cod}
          onChange={(e) => setF({ ...f, cod: e.target.checked })}
        />{" "}
        Allow cash on delivery
      </label>
      <Button type="submit">Save settings</Button>
    </form>
  );
}
