import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order — Nowhere" },
      {
        name: "description",
        content: "Check the status of your NOWHERE order with your order number and email.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url)
        throw new Error(result.error ?? "Could not find that order.");
      const target = new URL(result.url, window.location.origin);
      const id = target.pathname.split("/").pop() ?? "";
      await navigate({
        to: "/order/$id",
        params: { id },
        search: { token: target.searchParams.get("token") ?? "" },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <div className="page-container max-w-md py-12 md:py-20">
        <h1 className="display-heading text-[clamp(2.75rem,10vw,4.5rem)]">Track your order.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Enter the order number from your confirmation email (e.g. #1a2b3c4d) and the email you
          used at checkout.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          <div>
            <Label htmlFor="on" className="text-xs uppercase tracking-[0.14em]">
              Order number
            </Label>
            <Input
              id="on"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 h-12"
              placeholder="#1a2b3c4d"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="te" className="text-xs uppercase tracking-[0.14em]">
              Email
            </Label>
            <Input
              id="te"
              type="email"
              required
              autoComplete="email"
              className="mt-2 h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="h-14 w-full text-xs uppercase tracking-[0.22em]"
          >
            {busy ? "Checking…" : "Track order"}
          </Button>
        </form>
        <div className="mt-8">
          <WhatsAppButton label="Need help finding your order?" />
        </div>
      </div>
    </SiteLayout>
  );
}
