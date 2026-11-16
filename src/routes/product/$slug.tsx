import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { setCartOpen } from "@/hooks/use-cart-drawer";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/lib/store-catalog";
import { COLOR_NAMES, PRODUCT_SIZES, type ProductColor, type ProductSize } from "@/types/store";

const SWATCH: Record<ProductColor, string> = {
  ink: "#16181d",
  cherry: "#9b1b30",
  fern: "#3f5b45",
  cloud: "#e9e7e2",
  navy: "#1b2a4a",
};

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "Product"} — Noir Streetwear` },
      { name: "description", content: loaderData?.product.description.slice(0, 155) ?? "" },
    ],
  }),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-24 text-center">
        <h1 className="text-2xl font-black uppercase">Piece not found</h1>
        <Link
          to="/shop"
          search={{ category: "All pieces" }}
          className="mt-4 inline-block underline"
        >
          Back to shop
        </Link>
      </div>
    </SiteLayout>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { addItem } = useCart();
  const [size, setSize] = useState<ProductSize | null>(null);
  const [color, setColor] = useState<ProductColor>(product.colors[0] ?? "ink");
  const [added, setAdded] = useState(false);
  const gallery = [product.image, ...(product.alternateImage ? [product.alternateImage] : [])];
  const [active, setActive] = useState(0);
  const soldOut = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= 10;

  const handleAdd = () => {
    if (!size) {
      toast.error("Select a size first");
      return;
    }
    addItem(product, size, color, 1);
    setAdded(true);
    toast.success(`${product.name} added to your bag`);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2">
        <div>
          <img
            src={gallery[active]}
            alt={product.name}
            className="aspect-[4/5] w-full object-cover"
          />
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-3">
              {gallery.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-24 w-20 overflow-hidden border ${i === active ? "border-foreground" : "border-border"}`}
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Link
            to="/shop"
            search={{ category: product.category }}
            className="text-xs uppercase tracking-widest text-muted-foreground"
          >
            {product.category}
          </Link>
          <h1 className="mt-2 text-3xl font-black uppercase">{product.name}</h1>
          <p className="mt-2 text-xl">{formatPrice(product.priceCents)}</p>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <p className="mt-8 text-xs uppercase tracking-widest">Colour: {COLOR_NAMES[color]}</p>
          <div className="mt-2 flex gap-3">
            {product.colors.map((c) => (
              <button
                key={c}
                aria-label={COLOR_NAMES[c]}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className={`size-9 rounded-full border-2 ${c === color ? "border-foreground" : "border-border"}`}
                style={{ backgroundColor: SWATCH[c] }}
              />
            ))}
          </div>

          <p className="mt-8 text-xs uppercase tracking-widest">Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRODUCT_SIZES.map((s) => (
              <button
                key={s}
                aria-pressed={s === size}
                onClick={() => setSize(s)}
                className={`h-11 w-14 border text-sm ${s === size ? "bg-primary text-primary-foreground" : "border-border"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <p
            className={`mt-6 text-sm ${soldOut ? "text-destructive" : lowStock ? "text-amber-600" : "text-muted-foreground"}`}
          >
            {soldOut ? "Sold out" : lowStock ? `Only ${product.stock} left` : "In stock"}
          </p>
          <Button size="lg" className="mt-4 w-full" disabled={soldOut} onClick={handleAdd}>
            {added ? (
              <>
                <Check className="mr-2 size-4" />
                Added to bag
              </>
            ) : (
              "Add to bag"
            )}
          </Button>
          {added && (
            <p role="status" className="mt-3 border border-border bg-muted p-3 text-sm">
              ✓ {product.name} was added to your bag.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Free shipping on every order.</p>
        </div>
      </div>
    </SiteLayout>
  );
}
