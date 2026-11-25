import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLive, safeCtaUrl, type Campaign } from "@/lib/campaigns";
import { db } from "@/lib/db";

const EMPTY = {
  title: "",
  description: "",
  cta_label: "",
  cta_url: "",
  image_url: "",
  starts_at: "",
  ends_at: "",
};

export function CampaignsPanel() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
    void qc.invalidateQueries({ queryKey: ["active-campaign"] });
  };
  const { data, error } = useQuery({
    queryKey: ["admin-campaigns"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await db
        .from("campaigns")
        .select("*")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });
  const [form, setForm] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (form.cta_url && !safeCtaUrl(form.cta_url))
      return void toast.error("The button link must start with / or https://");
    if (form.image_url && !/^https:\/\//i.test(form.image_url))
      return void toast.error("The image link must start with https://");
    const starts = form.starts_at
      ? new Date(form.starts_at).toISOString()
      : new Date().toISOString();
    const ends = form.ends_at ? new Date(form.ends_at).toISOString() : null;
    if (ends && ends <= starts)
      return void toast.error("The end date must be after the start date.");
    const { error } = await db.from("campaigns").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_url: form.cta_url.trim() || null,
      image_url: form.image_url.trim() || null,
      starts_at: starts,
      ends_at: ends,
    });
    if (error) return void toast.error(error.message);
    toast.success("Campaign created");
    setForm(EMPTY);
    refresh();
  };

  if (error)
    return (
      <p className="text-sm text-muted-foreground">
        Campaigns are not set up yet. Apply <code>docs/phase-03-schema.sql</code> (ask Lovable, or
        run it in the Supabase SQL editor), then reload.
      </p>
    );
  return (
    <div className="space-y-8">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Title"
          placeholder="Title"
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          aria-label="Description"
          placeholder="Description (optional)"
          maxLength={300}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          aria-label="Button label"
          placeholder="Button label (e.g. Shop the drop)"
          maxLength={40}
          value={form.cta_label}
          onChange={(e) => set("cta_label", e.target.value)}
        />
        <Input
          aria-label="Button link"
          placeholder="Button link (/shop?category=Hoodies)"
          value={form.cta_url}
          onChange={(e) => set("cta_url", e.target.value)}
        />
        <Input
          aria-label="Image link"
          placeholder="Image link (https://…, optional)"
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          className="sm:col-span-2"
        />
        <label className="text-xs text-muted-foreground">
          Starts (blank = now)
          <Input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set("starts_at", e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Ends (blank = no end)
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => set("ends_at", e.target.value)}
            className="mt-1"
          />
        </label>
        <Button type="submit" className="sm:col-span-2">
          Create campaign
        </Button>
      </form>
      <ul className="divide-y divide-border border border-border text-sm">
        {(data ?? []).length === 0 && (
          <li className="p-4 text-muted-foreground">No campaigns yet.</li>
        )}
        {(data ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.starts_at).toLocaleString()} →{" "}
                {c.ends_at ? new Date(c.ends_at).toLocaleString() : "no end"} ·{" "}
                {isLive(c) ? "Live now" : c.active ? "Scheduled or expired" : "Inactive"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const { error } = await db
                    .from("campaigns")
                    .update({ active: !c.active })
                    .eq("id", c.id);
                  if (error) toast.error(error.message);
                  else refresh();
                }}
              >
                {c.active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!window.confirm(`Delete “${c.title}”?`)) return;
                  const { error } = await db.from("campaigns").delete().eq("id", c.id);
                  if (error) toast.error(error.message);
                  else refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
