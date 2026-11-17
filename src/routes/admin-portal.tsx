import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { DiscountsPanel } from "@/components/admin/DiscountsPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { Button } from "@/components/ui/button";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";

// Hidden route: not linked from navigation, footer or sitemap, and excluded from indexing.
export const Route = createFileRoute("/admin-portal")({
  head: () => ({
    meta: [{ title: "Not found" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPortal,
});

function FakeNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a href="/" className="mt-6 inline-block text-sm underline">
          Go home
        </a>
      </div>
    </div>
  );
}

function AdminPortal() {
  const { user, loading } = useAuth();
  const { isAdmin, checked } = useIsAdmin(user?.id);
  const [tab, setTab] = useState<"orders" | "products" | "discounts" | "settings">("orders");
  const { signOut } = useAuth();

  if (loading || !checked) return <div className="min-h-screen bg-background" />;
  // Unauthorised visitors (signed out or not an admin) see only a plain 404 — the real gate is Row Level Security.
  if (!user || !isAdmin) return <FakeNotFound />;

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-background px-4 py-10 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-widest">Admin</h1>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      <div className="mt-6 flex gap-2">
        {(["orders", "products", "discounts", "settings"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "orders" ? (
          <OrdersPanel />
        ) : tab === "products" ? (
          <ProductsPanel />
        ) : tab === "discounts" ? (
          <DiscountsPanel />
        ) : (
          <SettingsPanel />
        )}
      </div>
    </div>
  );
}
