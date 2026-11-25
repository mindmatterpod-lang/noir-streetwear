import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { useProducts } from "@/lib/products-api";
import type { Product } from "@/types/store";

const QuickView = lazy(() => import("@/components/shop/QuickView"));

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [{ title: "Saved for later — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: Wishlist,
});

function availability(p: Product) {
  return p.stock <= 0 ? "Sold out" : p.stock <= 10 ? `Only ${p.stock} left` : "In stock";
}

function Item({ product, index }: { product: Product; index: number }) {
  const { toggle } = useWishlist();
  const [open, setOpen] = useState(false);
  const soldOut = product.stock <= 0;
  return (
    <div>
      <ProductCard product={product} index={index} />
      <p className={`mt-3 text-xs ${soldOut ? "text-destructive" : "text-muted-foreground"}`}>
        {availability(product)}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <button
          type="button"
          disabled={soldOut}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="min-h-11 flex-1 bg-primary px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-40"
        >
          {soldOut ? "Unavailable" : "Add to bag"}
        </button>
        <button
          type="button"
          onClick={() => toggle(product.slug)}
          aria-label={`Remove ${product.name} from saved`}
          className="min-h-11 text-[11px] uppercase tracking-[0.16em] underline underline-offset-4"
        >
          Remove
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <QuickView
            product={product}
            open={open}
            onOpenChange={setOpen}
            onAdded={() => toggle(product.slug)}
          />
        </Suspense>
      )}
    </div>
  );
}

function Wishlist() {
  const { slugs } = useWishlist();
  const { user } = useAuth();
  const { data: products = [] } = useProducts();
  const saved = slugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is Product => !!p);
  return (
    <SiteLayout>
      <div className="page-container py-10 md:py-14">
        <h1 className="display-heading text-[clamp(2.75rem,10vw,5.5rem)]">Saved for later.</h1>
        {!user && saved.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Saved on this device.{" "}
            <Link
              to="/login"
              search={{ redirect: "/wishlist" }}
              className="underline underline-offset-4"
            >
              Sign in
            </Link>{" "}
            to keep your list on every device.
          </p>
        )}
        {saved.length === 0 ? (
          <div className="py-16">
            <p className="text-sm text-muted-foreground">
              Nothing saved yet. Tap the heart on any piece to keep it here.
            </p>
            <Link
              to="/shop"
              search={{ category: "All pieces" }}
              className="btn mt-6 bg-primary text-primary-foreground"
            >
              Explore collection
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {saved.map((p, i) => (
              <Item key={p.slug} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
