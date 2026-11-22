# Nowhere

Create a professional, international-grade, modern e-commerce web application with a sleek dark-and-light minimalist aesthetic suitable for high-end streetwear and apparel.

### 1. Core Architecture & Folder Structure

Organize the codebase cleanly at an enterprise/international level with clear modular separation under `src/`:

- `src/components/`: Reusable UI components grouped logically (e.g., `ui/`, `common/`, `layout/`)

- `src/components/cart/`: Slide-over cart drawer, cart item cards, checkout summary

- `src/components/shop/`: Product card, filter sidebar, product grid, size/color variant selectors

- `src/components/admin/`: Protected admin dashboard widgets, order management tables, stock management forms

- `src/pages/`: Page views (`Index.tsx`, `Shop.tsx`, `ProductDetail.tsx`, `Cart.tsx`, `Checkout.tsx`, `AdminDashboard.tsx`, `NotFound.tsx`)

- `src/integrations/supabase/`: Supabase client configuration, generated types, and database helper hooks

- `src/hooks/`: Custom React hooks (e.g., `useCart.ts`, `useProducts.ts`, `useOrders.ts`)

- `src/types/`: TypeScript interface definitions for products, orders, categories, and profiles

### 2. Product Catalog & Categories

The store focuses exclusively on 5 core apparel categories: **Hoodies, Tracksuits, Jackets, Trousers, and Shirts**.

- Implement category filtering, sorting (price low-high, high-low, newest), and keyword search.

- Product detail pages must feature multi-angle image galleries, size selectors (S, M, L, XL, XXL), color swatches, stock status indicators, and an "Add to Cart" notification banner.

### 3. Database Security & Absolute Ownership Rules (Supabase)

- **Data Privacy & Ownership:** Configure all data storage strictly inside the user's connected Supabase project. The AI builder platform and external tools must have zero access to production data schemas outside the user's direct project control.

- **Strict Row Level Security (RLS):**

  - Enable RLS on **every** Supabase table (`products`, `categories`, `orders`, `order_items`, `profiles`).

  - **Public/Customers:** Can `SELECT` published products and categories. Can `INSERT` orders (checkout flow) and read their own order history.

  - **Admin-Only Protection:** Tables tracking fulfillment progress, order statuses, and stock modification must be strictly locked down. Only users matching a designated secure admin UUID or possessing an explicit `admin` role in a secure `user_roles` table can view, update, or delete orders and products.

### 4. Secure Hidden Admin Panel & Order Progress Tracking

- Build a dedicated admin route (`/admin/dashboard` or `/admin-portal`) that is completely hidden from normal navigation menus, footers, and public maps.

- **Access Control:** The page must check authentication and verify admin privileges via Supabase metadata/roles. If unauthorized, redirect immediately to a 404 or clean login gate.

- **Admin Features:**

  - Real-time tracker for all incoming customer orders and their live progression states (e.g., _Pending -> Processing -> Shipped -> Delivered -> Cancelled_).

  - Ability to update order statuses and tracking numbers.

  - Simple inventory/product management interface to add, edit, or remove hoodies, tracksuits, jackets, trousers, and shirts.

### 5. Deployment Readiness (Vercel)

- Structure environment variable handling properly (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) so the project can be exported to GitHub and deployed seamlessly onto **Vercel** with zero build errors.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
