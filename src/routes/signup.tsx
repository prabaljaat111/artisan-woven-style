import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Sign up" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/_admin", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/login` },
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — signing you in…");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg">
        <h1 className="font-display italic text-3xl text-primary text-center">Create account</h1>
        <p className="text-xs text-muted-foreground text-center mt-1">First sign-up becomes admin automatically.</p>
        <form onSubmit={onSubmit} className="space-y-3 mt-6">
          <input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background"/>
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background"/>
          <input type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password (min 8 chars)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background"/>
          <button disabled={submitting} className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{submitting ? "Creating…" : "Create account"}</button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-5">
          Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}