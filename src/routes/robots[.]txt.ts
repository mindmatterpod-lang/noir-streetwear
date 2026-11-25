import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /cart",
          "Disallow: /checkout",
          "Disallow: /account",
          "Disallow: /wishlist",
          "Disallow: /order/",
          "Disallow: /track",
          "Disallow: /reset-password",
          "Disallow: /unsubscribe",
          "Disallow: /admin-portal",
          "Disallow: /login",
          "Disallow: /api/",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
