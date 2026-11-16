import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data: current }) => {
      setSession(current.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  return {
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
}

/** Admin status comes from the RLS-protected user_roles table, never from client-editable metadata. */
export function useIsAdmin(userId: string | undefined) {
  const [state, setState] = useState<{ isAdmin: boolean; checked: boolean }>({
    isAdmin: false,
    checked: false,
  });
  useEffect(() => {
    if (!userId) {
      setState({ isAdmin: false, checked: true });
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setState({ isAdmin: data !== null, checked: true });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return state;
}
