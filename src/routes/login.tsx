import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect:
      typeof s["redirect"] === "string" &&
      s["redirect"].startsWith("/") &&
      !s["redirect"].startsWith("//")
        ? s["redirect"]
        : "/account",
  }),
  head: () => ({
    meta: [{ title: "Sign in — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: LoginPage,
});

const TITLES: Record<Mode, string> = {
  signin: "Sign in.",
  signup: "Create account.",
  forgot: "Reset password.",
};

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode !== "forgot" && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        // Same message whether or not the address has an account, so this form cannot be used to find accounts.
        setResetSent(true);
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await navigate({ to: redirect });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: name.trim() ? { full_name: name.trim().slice(0, 120) } : {},
          },
        });
        if (error) throw error;
        if (data.session) await navigate({ to: redirect });
        else toast.success("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const link = "min-h-11 text-xs uppercase tracking-[0.16em] underline underline-offset-4";
  return (
    <SiteLayout>
      <div className="page-container max-w-md py-12 md:py-20">
        <h1 className="display-heading text-[clamp(2.75rem,10vw,4.5rem)]">{TITLES[mode]}</h1>
        {mode === "forgot" && resetSent ? (
          <div className="mt-8" role="status">
            <p className="text-sm leading-relaxed text-muted-foreground">
              If an account exists for that email, we&rsquo;ve sent a link to reset your password.
              The link expires, so use it soon.
            </p>
            <button
              type="button"
              className={`${link} mt-6`}
              onClick={() => {
                setResetSent(false);
                setMode("signin");
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="mt-8 space-y-5">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="name" className="text-xs uppercase tracking-[0.14em]">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    className="mt-2 h-12"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email" className="text-xs uppercase tracking-[0.14em]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {mode !== "forgot" && (
                <div>
                  <Label htmlFor="password" className="text-xs uppercase tracking-[0.14em]">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="mt-2 h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="h-14 w-full text-xs uppercase tracking-[0.22em]"
                disabled={busy}
              >
                {busy
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>
            </form>
            <div className="mt-6 flex flex-col items-start">
              {mode === "signin" && (
                <button type="button" className={link} onClick={() => setMode("forgot")}>
                  Forgot your password?
                </button>
              )}
              <button
                type="button"
                className={link}
                onClick={() =>
                  setMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin")
                }
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : mode === "signup"
                    ? "Already have an account? Sign in"
                    : "Back to sign in"}
              </button>
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
