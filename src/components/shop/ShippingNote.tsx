import { formatPrice } from "@/lib/format";
import { useStoreSettings } from "@/lib/store-settings";

/** One-line delivery summary driven by the admin's store settings. */
export function ShippingNote({ className }: { className?: string }) {
  const { data } = useStoreSettings();
  if (!data) return null;
  const free = data.free_shipping_threshold_cents;
  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      Delivery across Pakistan:{" "}
      {data.shipping_flat_cents === 0 ? "free" : formatPrice(data.shipping_flat_cents)}
      {free !== null && data.shipping_flat_cents > 0
        ? `, free on orders over ${formatPrice(free)}`
        : ""}
      {data.cod_enabled ? " · Cash on delivery available" : ""}
    </p>
  );
}
