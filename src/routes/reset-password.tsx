import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password — Nowhere" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "yes" | "no">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // The emailed link signs the visitor into a short-lived recovery session; without one there is nothing to reset.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady("yes");
    });
    const timer = setTimeout(() => {
      void supabase.auth.getSession().then(({ data: s }) => setReady(s.session ? "yes" : "no"));
    }, 1200);
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) return void toast.error("Password must be at least 8 characters");
    if (password !== confirm) return void toast.error("The two passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated.");
    await navigate({ to: "/account" });
  };

  return (
    <SiteLayout>
      <div className="page-container max-w-md py-12 md:py-20">
        <h1 className="display-heading text-[clamp(2.75rem,10vw,4.5rem)]">New password.</h1>
        {ready === "checking" ? (
          <p className="mt-8 text-sm text-muted-foreground" role="status">
            Checking your link…
          </p>
        ) : ready === "no" ? (
          <div className="mt-8" role="alert">
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link
              to="/login"
              search={{ redirect: "/account" }}
              className="mt-6 inline-block text-xs uppercase tracking-[0.16em] underline underline-offset-4"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="pw" className="text-xs uppercase tracking-[0.14em]">
                New password
              </Label>
              <Input
                id="pw"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-2 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pw2" className="text-xs uppercase tracking-[0.14em]">
                Confirm password
              </Label>
              <Input
                id="pw2"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-2 h-12"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full text-xs uppercase tracking-[0.22em]"
              disabled={busy}
            >
              {busy ? "Please wait…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
