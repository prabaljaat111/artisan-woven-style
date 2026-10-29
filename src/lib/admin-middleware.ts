import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId, claims } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw new Error("Forbidden: admin only");
    // An enrolled TOTP user must challenge their session before privileged RPCs.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error("Could not verify account security");
    if (userData.user?.factors?.some(f => f.factor_type === "totp" && f.status === "verified") && claims.aal !== "aal2") throw new Error("Two-factor verification required");
    return next({ context: { supabase, userId, isAdmin: true } });
  });