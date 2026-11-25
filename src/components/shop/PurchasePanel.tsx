import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SizeGuide } from "@/components/shop/SizeGuide";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { openCartWithMessage } from "@/hooks/use-cart-drawer";
import { formatPrice } from "@/lib/format";
import {
  COLOR_NAMES,
  COLOR_SWATCH,
  PRODUCT_SIZES,
  type Product,
  type ProductColor,
  type ProductSize,
} from "@/types/store";

const MAX_PER_ORDER = 5;

/**
 * Colour, size, quantity and Add to bag for one product. Used by the product page and by Quick View so the
 * validation and cart rules exist in exactly one place. Stock is tracked per product (not per size) in the
 * database, so sizes are only disabled when the whole product is sold out.
 */
export function PurchasePanel({
  product,
  onAdded,
  stickyBar = false,
}: {
  product: Product;
  onAdded?: () => void;
  /** Phones only: a fixed Add to bag bar that appears when the main button scrolls out of view. */
  stickyBar?: boolean;
}) {
  const { items, addItem } = useCart();
  const [size, setSize] = useState<ProductSize | null>(null);
  const [color, setColor] = useState<ProductColor>(product.colors[0] ?? "ink");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [mainVisible, setMainVisible] = useState(true);
  const sizesRef = useRef<HTMLDivElement>(null);
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ids = useId();

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 10;
  const maxQuantity = Math.max(1, Math.min(product.stock, MAX_PER_ORDER));
  const inBag =
    items.find((i) => i.productId === product.id && i.size === size && i.color === color)
      ?.quantity ?? 0;

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!stickyBar || !mainButtonRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setMainVisible(!!entry?.isIntersecting));
    observer.observe(mainButtonRef.current);
    return () => observer.disconnect();
  }, [stickyBar]);

  const handleAdd = () => {
    if (soldOut) return;
    if (!size) {
      setError("Please select a size to add this to your bag.");
      sizesRef.current?.scrollIntoView?.({ block: "center" });
      sizesRef.current?.querySelector("button")?.focus({ preventScroll: true });
      return;
    }
    if (inBag >= maxQuantity) {
      setError(`You already have the maximum quantity (${maxQuantity}) of this piece in your bag.`);
      return;
    }
    const toAdd = Math.min(quantity, maxQuantity - inBag);
    addItem(product, size, color, toAdd);
    setError(null);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2000);
    openCartWithMessage(`${product.name} (${size}) added to your bag`);
    onAdded?.();
  };

  const label = "text-[11px] font-medium uppercase tracking-[0.24em]";
  const errorId = `${ids}-error`;
  const addLabel = soldOut ? "Sold out" : added ? "Added to bag" : "Add to bag";

  return (
    <div>
      {product.colors.length > 0 && (
        <div>
          <p id={`${ids}-color`} className={label}>
            Colour <span className="text-muted-foreground">— {COLOR_NAMES[color]}</span>
          </p>
          <div role="group" aria-labelledby={`${ids}-color`} className="mt-3 flex flex-wrap gap-3">
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COLOR_NAMES[c]}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className={`flex size-11 items-center justify-center rounded-full border transition-colors ${c === color ? "border-foreground" : "border-border hover:border-foreground/50"}`}
              >
                <span
                  className="size-8 rounded-full border border-foreground/20"
                  style={{ backgroundColor: COLOR_SWATCH[c] }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8" ref={sizesRef}>
        <div className="flex items-center justify-between">
          <p id={`${ids}-size`} className={label}>
            Size {size && <span className="text-muted-foreground">— {size}</span>}
          </p>
          <SizeGuide selected={size} onSelect={setSize} />
        </div>
        <div
          role="group"
          aria-labelledby={`${ids}-size`}
          aria-describedby={error ? errorId : undefined}
          className="mt-3 grid grid-cols-5 gap-2"
        >
          {PRODUCT_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={soldOut}
              aria-pressed={s === size}
              onClick={() => {
                setSize(s);
                setError(null);
              }}
              className={`h-12 border text-sm transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground disabled:line-through ${s === size ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <p id={errorId} role="alert" className="mt-2 min-h-5 text-sm text-destructive">
          {error}
        </p>
      </div>

      <p
        className={`mt-4 text-sm ${soldOut ? "text-destructive" : "text-muted-foreground"}`}
        aria-live="polite"
      >
        {soldOut ? "Sold out" : lowStock ? `Only ${product.stock} left` : "In stock"}
      </p>

      <div className="mt-4 flex items-stretch gap-3">
        <div role="group" aria-label="Quantity" className="flex items-center border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={soldOut || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-12 items-center justify-center disabled:opacity-40 sm:size-14"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={soldOut || quantity >= maxQuantity}
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            className="flex size-12 items-center justify-center disabled:opacity-40 sm:size-14"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button
          ref={mainButtonRef}
          type="button"
          size="lg"
          disabled={soldOut}
          onClick={handleAdd}
          className="h-12 min-w-0 flex-1 px-3 text-xs uppercase tracking-[0.2em] sm:h-14"
        >
          {added && <Check className="animate-pop mr-2 size-4" aria-hidden="true" />}
          {addLabel}
        </Button>
      </div>
      {quantity >= maxQuantity && !soldOut && (
        <p className="mt-2 text-xs text-muted-foreground">
          {maxQuantity < MAX_PER_ORDER
            ? `Only ${maxQuantity} available.`
            : `Maximum ${MAX_PER_ORDER} per order.`}
        </p>
      )}

      {stickyBar &&
        !soldOut &&
        !mainVisible &&
        typeof document !== "undefined" &&
        // Portalled to <body>: the page-transition animation on <main> would otherwise become the
        // containing block for this fixed bar and push it to the bottom of the page instead of the screen.
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium uppercase tracking-[0.08em]">
                {product.name}
              </p>
              <p className="text-sm tabular-nums">
                {formatPrice(product.priceCents)}
                {size && <span className="text-muted-foreground"> · {size}</span>}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              className="h-12 px-6 text-xs uppercase tracking-[0.2em]"
            >
              {size ? "Add to bag" : "Select size"}
            </Button>
          </div>,
          document.body,
        )}
    </div>
  );
}
