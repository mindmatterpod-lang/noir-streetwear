import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [{ title: "Your orders — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: Account,
});

function Account() {
  const { user, loading, signOut } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, total_cents, tracking_number, created_at, order_items(id, product_name, size, color, quantity)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {loading ? null : !user ? (
          <div className="py-16 text-center">
            <p>Sign in to see your order history.</p>
            <Button asChild className="mt-4">
              <Link to="/login" search={{ redirect: "/account" }}>
                Sign in
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black uppercase tracking-widest">Orders</h1>
              <Button variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            {isLoading ? (
              <p className="mt-8">Loading…</p>
            ) : !orders?.length ? (
              <p className="mt-8 text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="mt-8 space-y-4">
                {orders.map((o) => (
                  <li key={o.id} className="border border-border p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                      </span>
                      <span className="uppercase tracking-widest">{o.status}</span>
                    </div>
                    <ul className="mt-2 text-muted-foreground">
                      {o.order_items.map((i) => (
                        <li key={i.id}>
                          {i.product_name} · {i.size} · {i.color} × {i.quantity}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex justify-between">
                      <span>
                        {o.tracking_number ? `Tracking: ${o.tracking_number}` : "No tracking yet"}
                      </span>
                      <span>{formatPrice(o.total_cents)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
