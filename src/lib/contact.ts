import { SUPPORT_EMAIL, WHATSAPP_NUMBER } from "@/lib/site-config";

/** True for values that are still template placeholders (zeros, example.com, "Your …"). */
export function isPlaceholder(value: string): boolean {
  return /0{6,}|@[^@]*\.example$|^your\s/i.test(value.trim());
}

/**
 * International digits for wa.me, or null when no real number is configured.
 * Accepts "+92 300 1234567", "0300-1234567" and "923001234567".
 */
export function whatsappDigits(raw: string = WHATSAPP_NUMBER): string | null {
  if (!raw || isPlaceholder(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

/** wa.me link with a URL-encoded prefilled message, or null (so callers render nothing) when unconfigured. */
export function whatsappLink(message?: string, raw?: string): string | null {
  const digits = whatsappDigits(raw);
  if (!digits) return null;
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}

/** The support email, or null while it is still the template placeholder. */
export function supportEmail(raw: string = SUPPORT_EMAIL): string | null {
  return raw && !isPlaceholder(raw) ? raw : null;
}

/** Prefilled messages. They only ever contain product names and the public order number, never personal details. */
export const supportMessages = {
  product: (name: string) => `Hi NOWHERE, I have a question about ${name}.`,
  size: (name: string) => `Hi NOWHERE, I need help choosing the right size for ${name}.`,
  order: (orderNumber: string) => `Hi NOWHERE, I need help regarding my order ${orderNumber}.`,
  general: () => "Hi NOWHERE, I have a question.",
} as const;
