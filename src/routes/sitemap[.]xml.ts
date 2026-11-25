import { createFileRoute } from "@tanstack/react-router";

import { POLICIES } from "@/lib/policies";
import { fetchProducts } from "@/lib/products-api";
import { CORE_CATEGORIES } from "@/types/store";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const products = await fetchProducts().catch(() => []);
        // Only canonical, indexable pages. Filtered views, account, bag, checkout and order pages are left out.
        const entries: { path: string; lastmod?: string }[] = [
          { path: "/" },
          { path: "/shop" },
          ...CORE_CATEGORIES.map((c) => ({ path: `/shop?category=${encodeURIComponent(c)}` })),
          ...products.map((p) => ({
            path: `/product/${p.slug}`,
            ...(p.createdAt ? { lastmod: p.createdAt.slice(0, 10) } : {}),
          })),
          ...Object.keys(POLICIES).map((slug) => ({ path: `/policies/${slug}` })),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
          .map(
            (e) =>
              `  <url><loc>${esc(origin + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`,
          )
          .join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
