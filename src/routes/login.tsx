import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isAdmin ? "/admin" : "/", replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Signed in");
  }

  async function onGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
    if (r.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg">
        <h1 className="font-display italic text-3xl text-primary text-center">Sign in</h1>
        <p className="text-xs text-muted-foreground text-center mt-1">Indian Handicraft Standards</p>

        <button
          onClick={onGoogle}
          className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-background border border-border rounded-full py-2.5 text-sm font-medium hover:bg-secondary/50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC04" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5"><div className="h-px flex-1 bg-border"/><span className="text-[11px] text-muted-foreground uppercase tracking-wider">or email</span><div className="h-px flex-1 bg-border"/></div>

        <form onSubmit={onEmailLogin} className="space-y-3">
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background"/>
          <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background"/>
          <button disabled={submitting} className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{submitting ? "Signing in…" : "Sign in"}</button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-5">
          No account? <Link to="/signup" className="text-primary font-medium">Create one</Link>
        </p>
        <p className="text-[10px] text-center text-muted-foreground mt-2">First sign-up automatically becomes admin.</p>
      </div>
    </div>
  );
}