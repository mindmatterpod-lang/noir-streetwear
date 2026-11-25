import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { useAuth } from "@/hooks/use-auth";

/** Account pages: shows a sign-in prompt until there is a session. Data is protected by row-level security either way. */
export function RequireAuth({
  redirect,
  children,
}: {
  redirect: string;
  children: (user: User) => ReactNode;
}) {
  const { user, loading } = useAuth();
  return (
    <SiteLayout>
      <div className="page-container max-w-4xl py-10 md:py-14">
        {loading ? null : !user ? (
          <div className="py-16">
            <h1 className="display-heading text-5xl">Sign in.</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Sign in to see your orders, addresses and saved pieces.
            </p>
            <Link
              to="/login"
              search={{ redirect }}
              className="btn mt-8 bg-primary text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        ) : (
          children(user)
        )}
      </div>
    </SiteLayout>
  );
}
