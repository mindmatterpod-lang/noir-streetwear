import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/track-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const mod = await import("@/lib/track-order.server");
        return mod.handleTrackOrder(request);
      },
    },
  },
});
