import { MessageCircle } from "lucide-react";

import { whatsappLink } from "@/lib/contact";

/**
 * Opens WhatsApp with a prefilled message to the configured business number.
 * Renders nothing while the number in site-config is still the placeholder, so a fake number is never shown.
 */
export function WhatsAppButton({
  message,
  label = "Chat on WhatsApp",
  className = "",
}: {
  message?: string;
  label?: string;
  className?: string;
}) {
  const href = whatsappLink(message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-2 border border-border px-4 text-xs font-medium uppercase tracking-[0.16em] transition-colors hover:bg-secondary ${className}`}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
