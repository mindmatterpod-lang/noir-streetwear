import { formatPrice } from "@/lib/format";
import { shippingProgress } from "@/lib/shipping-progress";
import { useStoreSettings } from "@/lib/store-settings";

/** Progress towards free delivery. The threshold and delivery charge come from the store settings, never hard-coded. */
export function FreeShippingProgress({ subtotalCents }: { subtotalCents: number }) {
  const { data } = useStoreSettings();
  const progress = shippingProgress(
    subtotalCents,
    data?.free_shipping_threshold_cents,
    data?.shipping_flat_cents ?? 0,
  );
  if (!progress.applicable) return null;
  return (
    <div className="border border-border p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em]" role="status">
        {progress.unlocked
          ? "You've unlocked free delivery."
          : `You're ${formatPrice(progress.remainingCents)} away from free delivery.`}
      </p>
      <div
        role="progressbar"
        aria-label="Progress towards free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="mt-3 h-1 w-full bg-border"
      >
        <div
          className="h-full bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Based on your bag total before delivery. A discount code is deducted before this is checked.
      </p>
    </div>
  );
}
