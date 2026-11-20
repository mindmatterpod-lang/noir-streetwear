import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

interface AdminOrder {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_cents: number;
  tracking_number: string | null;
  created_at: string;
  shipping_name: string;
  shipping_email: string;
  shipping_address: string;
  shipping_city: string;
  shipping_country: string;
  shipping_phone: string | null;
  shipping_province: string | null;
  order_items: {
    id: string;
    product_name: string;
    size: string;
    color: string;
    quantity: number;
  }[];
}

const NEXT: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function OrdersPanel() {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-orders"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error: e } = await db
        .from("orders")
        .select(
          "id, status, payment_method, payment_status, total_cents, tracking_number, created_at, shipping_name, shipping_email, shipping_phone, shipping_province, shipping_address, shipping_city, shipping_country, order_items(id, product_name, size, color, quantity)",
        )
        .order("created_at", { ascending: false });
      if (e) throw e;
      return data as unknown as AdminOrder[];
    },
  });

  // Live updates when Realtime is enabled for orders; polling above covers the case where it is not.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void qc.invalidateQueries({ queryKey: ["admin-orders"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const update = async (
    id: string,
    patch: { status?: string; tracking_number?: string | null },
  ) => {
    const { error: e } = await supabase.from("orders").update(patch).eq("id", id);
    if (e) toast.error(e.message);
    else {
      toast.success("Order updated");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  };

  if (isLoading) return <p>Loading orders…</p>;
  if (error) return <p className="text-destructive">Could not load orders.</p>;
  if (!orders?.length) return <p className="text-muted-foreground">No orders yet.</p>;

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="border border-border p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium">
              #{o.id.slice(0, 8)} · {o.shipping_name} · {o.shipping_email}
            </span>
            <span className="uppercase tracking-widest">
              {o.status} · {o.payment_method === "cod" ? "COD" : "card"} · {o.payment_status}
            </span>
          </div>
          <p className="text-muted-foreground">
            {o.shipping_address}, {o.shipping_city}, {o.shipping_province ?? ""} · Phone:{" "}
            {o.shipping_phone ?? "n/a"}
          </p>
          <ul className="my-2">
            {o.order_items.map((i) => (
              <li key={i.id}>
                {i.product_name} · {i.size} · {i.color} × {i.quantity}
              </li>
            ))}
          </ul>
          <p>
            {formatPrice(o.total_cents)} · {new Date(o.created_at).toLocaleString()}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(NEXT[o.status] ?? []).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "cancelled" ? "destructive" : "default"}
                onClick={() => void update(o.id, { status: s })}
              >
                Mark {s}
              </Button>
            ))}
            <Input
              className="h-8 w-48"
              placeholder="Tracking number"
              value={tracking[o.id] ?? o.tracking_number ?? ""}
              onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void update(o.id, { tracking_number: (tracking[o.id] ?? "").trim() || null })
              }
            >
              Save tracking
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
