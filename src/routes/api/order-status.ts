import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/order-status")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        (await import("@/lib/checkout.server")).handleOrderStatusNotify(request),
    },
  },
});
