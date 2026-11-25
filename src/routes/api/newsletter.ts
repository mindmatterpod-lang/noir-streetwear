import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/newsletter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const mod = await import("@/lib/newsletter.server");
        return mod.handleNewsletter(request);
      },
    },
  },
});
