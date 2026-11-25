import { useId, useState, type FormEvent } from "react";

import { events } from "@/lib/analytics";

/** Real sign-up: the server validates, stores consent and sends the welcome email. Shown on the dark footer. */
export function NewsletterForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "busy") return;
    if (!consent) {
      setState("error");
      setMessage("Please tick the box to agree to receive emails.");
      return;
    }
    setState("busy");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent: true, website, source: "footer" }),
      });
      const result = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
      events.newsletter();
      setMessage(
        result.status === "already"
          ? "You're already on the list."
          : "You're in. Check your inbox for a welcome email.",
      );
      setState("done");
      setEmail("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  return (
    <section aria-labelledby={`${id}-h`} className="border-b border-[var(--nw-line)]">
      <div className="page-container grid gap-8 py-14 md:grid-cols-2 md:items-end lg:py-20">
        <div>
          <h2 id={`${id}-h`} className="display-heading text-[clamp(2.5rem,7vw,4.5rem)]">
            Get in the know.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--nw-mute)]">
            New drops. Exclusive releases. The world of NOWHERE.
          </p>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>
          <label htmlFor={`${id}-e`} className="sr-only">
            Email address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id={`${id}-e`}
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={`${id}-m`}
              className="h-12 w-full min-w-0 border sm:flex-1 border-[var(--nw-line)] bg-transparent px-4 text-sm text-[var(--nw-paper)] placeholder:text-[var(--nw-mute)]"
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="btn btn-primary disabled:opacity-60"
            >
              {state === "busy" ? "Joining…" : "Join now"}
            </button>
          </div>
          <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 text-xs leading-relaxed text-[var(--nw-mute)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--nw-paper)]"
            />
            I agree to receive marketing emails from NOWHERE. I can unsubscribe at any time.
          </label>
          <p
            id={`${id}-m`}
            role={state === "error" ? "alert" : "status"}
            className={`mt-2 min-h-5 text-xs ${state === "error" ? "text-red-400" : "text-[var(--nw-stone)]"}`}
          >
            {state === "done" || state === "error" ? message : ""}
          </p>
        </form>
      </div>
    </section>
  );
}
