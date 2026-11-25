import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): { token?: string } =>
    typeof s["token"] === "string" ? { token: s["token"] } : {},
  head: () => ({
    meta: [{ title: "Unsubscribe — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // Unsubscribing takes an explicit click, so email scanners that pre-fetch links cannot unsubscribe people by accident.
  const confirm = async () => {
    setState("busy");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "unsubscribe", token }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
      setState("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  return (
    <SiteLayout>
      <div className="page-container max-w-md py-12 md:py-20">
        <h1 className="display-heading text-[clamp(2.25rem,10vw,4.5rem)]">
          {state === "done" ? "You're unsubscribed." : "Unsubscribe."}
        </h1>
        {state === "done" ? (
          <p className="mt-6 text-sm text-muted-foreground" role="status">
            You won&rsquo;t receive NOWHERE marketing emails any more. Order updates are unaffected.
          </p>
        ) : !token ? (
          <p className="mt-6 text-sm text-muted-foreground">This unsubscribe link is not valid.</p>
        ) : (
          <>
            <p className="mt-6 text-sm text-muted-foreground">
              Confirm that you no longer want to receive marketing emails from NOWHERE.
            </p>
            {state === "error" && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {message}
              </p>
            )}
            <Button
              onClick={() => void confirm()}
              disabled={state === "busy"}
              size="lg"
              className="mt-6 h-14 w-full text-xs uppercase tracking-[0.22em]"
            >
              {state === "busy" ? "Please wait…" : "Unsubscribe"}
            </Button>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
