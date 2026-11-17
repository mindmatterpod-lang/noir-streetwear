# Deploying the Shopify-parity update

## 1. Database (do this first)
Apply `docs/shopify-parity.sql` (ask Lovable to run it, or paste it in the Supabase SQL editor). It is safe to run twice.
It adds: shipping/tax settings, discount codes, guest checkout + payment fields on orders, reviews, product photo storage,
and fixes two issues in the earlier migrations (admins could not read or update orders).
Then make yourself admin: `insert into user_roles (user_id, role) values ('<your auth user id>', 'admin');`
Verify any time with `npm run test:sql` (runs the SQL against an in-memory Postgres).

## 2. Vercel environment variables
| Variable | Needed for |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server routes (same values as `.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | checkout, emails, webhook (**secret**, server only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | order emails (verify your domain in Resend; without it emails are skipped) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional card payments |

Without the Stripe variables the store runs with cash on delivery only. Stripe webhook endpoint: `https://<your-domain>/api/stripe-webhook`, event `checkout.session.completed`.

## 3. Before launch
Edit `src/lib/site-config.ts` (name, email, phone, address) and have the text in `src/lib/policies.ts` reviewed.
Then merge the `shopify-parity` branch: Vercel builds with `vercel.json`.
