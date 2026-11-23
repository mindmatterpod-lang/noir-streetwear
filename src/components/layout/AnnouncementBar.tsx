import { formatPrice } from "@/lib/format";
import { useStoreSettings } from "@/lib/store-settings";

/** Thin, centred strip above the header. The free-shipping amount always comes from the store settings. */
export function AnnouncementBar() {
  const { data } = useStoreSettings();
  const free = data?.free_shipping_threshold_cents;
  const message = free
    ? `Free shipping on orders above ${formatPrice(free)}`
    : data?.cod_enabled === false
      ? "Delivery across Pakistan"
      : "Cash on delivery across Pakistan";
  return (
    <div
      className="bg-[var(--nw-paper)] px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--nw-ink)] sm:text-[11px]"
      role="region"
      aria-label="Store announcement"
    >
      {message}
    </div>
  );
}
