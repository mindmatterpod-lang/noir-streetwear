import { formatPrice } from "@/lib/format";
import { useStoreSettings } from "@/lib/store-settings";

/** Slow scrolling strip above the header; pauses on hover and stays still for reduced-motion visitors. */
export function AnnouncementBar() {
  const { data } = useStoreSettings();
  const free = data?.free_shipping_threshold_cents;
  const messages = [
    ...(data?.cod_enabled === false ? [] : ["Cash on delivery across Pakistan"]),
    ...(free ? [`Free delivery over ${formatPrice(free)}`] : []),
    "7-day exchange",
    "New drops every week",
  ];
  return (
    <div
      className="marquee overflow-hidden bg-primary py-2 text-[11px] uppercase tracking-[0.25em] text-primary-foreground"
      role="region"
      aria-label="Store announcements"
    >
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
            {messages.map((message) => (
              <span key={message} className="flex items-center">
                <span className="px-6">{message}</span>
                <span aria-hidden="true">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
