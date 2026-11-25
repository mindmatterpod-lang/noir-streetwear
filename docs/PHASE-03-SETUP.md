# Phase 03 setup checklist

Everything below is optional until you want that feature live. Nothing here breaks the store if skipped.

## 1. Apply the schema (newsletter, campaigns, notification log)
`docs/phase-03-schema.sql` — ask Lovable to apply it, or run it in the Supabase SQL editor.
Until applied: the footer newsletter form answers "sign-up isn't available yet", no campaign banner shows,
and order emails use an in-memory duplicate guard only (per server instance).

## 2. Real contact details (`src/lib/site-config.ts`)
`WHATSAPP_NUMBER`, `SUPPORT_EMAIL`, `SUPPORT_PHONE` and `BUSINESS_ADDRESS` are still template placeholders.
WhatsApp buttons and email links stay hidden until real values are set. Policy pages still print the placeholders.

## 3. Email delivery (existing variables)
`RESEND_API_KEY` and `EMAIL_FROM` (a verified sender domain). Without a key, emails are skipped and logged.
Order emails retry on provider outages (429/5xx); permanent errors are not retried.

## 4. Social links
Add verified profiles to `SOCIAL_LINKS` in `site-config.ts`; they appear in the footer and in Organization data.

## 5. Analytics
Uses the existing Vercel Web Analytics (cookie-free). Page views work on every plan; custom ecommerce events
(view_item, add_to_cart, begin_checkout, purchase, wishlist, search, filter_use, newsletter_signup)
need a Vercel plan that includes custom events. No names, emails, phones or addresses are ever sent.

## 6. Customer data location
Name, phone, up to 3 saved addresses and the saved-pieces list live in each customer's own auth metadata,
visible only to that customer. A dedicated `wishlist_items` / `addresses` table would be the next step if you
need to query this data server-side.

## Not included (needs infrastructure)
Abandoned-cart emails (server-side carts + a scheduler + consent), WhatsApp/SMS notifications (needs an official
provider such as the WhatsApp Business API), review photos and "report a review" (storage + table), courier APIs.
