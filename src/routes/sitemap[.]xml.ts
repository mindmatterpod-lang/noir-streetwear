import { createFileRoute } from "@tanstack/react-router";

import { POLICIES } from "@/lib/policies";
import { fetchProducts } from "@/lib/products-api";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const products = await fetchProducts();
        const paths = [
          "/",
          "/shop",
          ...products.map((p) => `/product/${p.slug}`),
          ...Object.keys(POLICIES).map((slug) => `/policies/${slug}`),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
          .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
          .join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
