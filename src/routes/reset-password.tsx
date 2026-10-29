import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset Password — Indian Handicraft Standards" },
      { name: "description", content: "Set a new password for your Indian Handicraft Standards account." },
      { property: "og:title", content: "Reset Password — Indian Handicraft Standards" },
      { property: "og:description", content: "Set a new password for your Indian Handicraft Standards account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const input = "w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background";
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center"><KeyRound className="h-5 w-5" /></div>
          <h1 className="font-display italic text-3xl text-primary text-center">Set a new password</h1>
        </div>
        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground text-center">Open this page from the reset link in your email. If the link expired, request a new one from the sign-in page.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-6">
            <input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className={input} />
            <input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" className={input} />
            <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{busy ? "Saving…" : "Update password"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
