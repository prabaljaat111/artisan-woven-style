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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Ignore noisy events that fire on tab focus / token refresh and don't
      // change identity — they were causing the admin pages to flash "Loading…"
      // every time the user switched browser tabs.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setState((s) => (s.session?.user.id === session?.user.id
          ? { ...s, session, user: session?.user ?? null }
          : s));
        return;
      }
      if (event === "INITIAL_SESSION") return; // handled by getSession() below
      if (!session) {
        setState({ loading: false, user: null, session: null, isAdmin: false });
        return;
      }
      // If it's the same user we already know about, just refresh the session
      // object — don't flip loading back to true (that re-runs every page's
      // data loaders and looks like a full refresh).
      setState((s) => {
        const sameUser = s.user?.id === session.user.id;
        return sameUser
          ? { ...s, user: session.user, session }
          : { ...s, loading: true, user: session.user, session };
      });
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