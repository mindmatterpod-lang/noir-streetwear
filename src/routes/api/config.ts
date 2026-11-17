import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/config")({
  server: {
    handlers: { GET: async () => (await import("@/lib/checkout.server")).configResponse() },
  },
});
