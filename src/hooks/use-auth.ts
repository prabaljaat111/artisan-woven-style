import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null, isAdmin: false });

  useEffect(() => {
    let mounted = true;

    async function checkRole(userId: string) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    }

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setState({ loading: false, user: null, session: null, isAdmin: false });
        return;
      }
      // Keep loading=true until the role check resolves so consumers
      // (e.g. /login redirect) don't act on a stale isAdmin=false.
      setState((s) => ({ ...s, loading: true, user: session.user, session }));
      // Defer role lookup so it doesn't deadlock the listener
      setTimeout(async () => {
        const isAdmin = await checkRole(session.user.id);
        if (mounted) setState({ loading: false, user: session.user, session, isAdmin });
      }, 0);
    });

    // Then bootstrap
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        setState({ loading: false, user: null, session: null, isAdmin: false });
        return;
      }
      const isAdmin = await checkRole(session.user.id);
      if (mounted) setState({ loading: false, user: session.user, session, isAdmin });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}