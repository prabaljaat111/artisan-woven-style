import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ name: "description", content: "Sign in to Indian Handicraft Standards administration." }, { property: "og:title", content: "Admin Sign In \u2014 Indian Handicraft Standards" }, { property: "og:description", content: "Sign in to Indian Handicraft Standards administration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
      { title: "Admin Sign In \u2014 Indian Handicraft Standards" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});

const LOCK_KEY = "ihs_admin_lock_v1";
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(254),
  password: z.string().min(8, "Password too short").max(128),
});

type LockState = { count: number; until: number | null };

function readLock(): LockState {
  if (typeof window === "undefined") return { count: 0, until: null };
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return { count: 0, until: null };
    const parsed = JSON.parse(raw) as LockState;
    if (parsed.until && parsed.until < Date.now()) return { count: 0, until: null };
    return parsed;
  } catch {
    return { count: 0, until: null };
  }
}

function writeLock(state: LockState) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lock, setLock] = useState<LockState>({ count: 0, until: null });
  const [now, setNow] = useState(Date.now());
  const submittedAt = useRef(0);

  useEffect(() => {
    setLock(readLock());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && isAdmin) navigate({ to: "/admin", replace: true });
    else if (user && !isAdmin) {
      supabase.auth.signOut();
      toast.error("This account is not authorised for admin access.");
    }
  }, [user, isAdmin, loading, navigate]);

  const locked = !!lock.until && lock.until > now;
  const remaining = locked && lock.until ? Math.ceil((lock.until - now) / 1000) : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    // Simple throttle: at least 800ms between submissions
    const since = Date.now() - submittedAt.current;
    if (since < 800) return;
    submittedAt.current = Date.now();

    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.session) {
      const next: LockState = { count: lock.count + 1, until: null };
      if (next.count >= MAX_ATTEMPTS) {
        next.until = Date.now() + LOCK_MINUTES * 60 * 1000;
        next.count = 0;
        toast.error(`Too many attempts. Locked for ${LOCK_MINUTES} minutes.`);
      } else {
        toast.error("Invalid credentials");
      }
      writeLock(next);
      setLock(next);
      setSubmitting(false);
      return;
    }

    // Verify admin role server-side before granting access
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      await supabase.auth.signOut();
      toast.error("This account is not authorised for admin access.");
      setSubmitting(false);
      return;
    }

    writeLock({ count: 0, until: null });
    setLock({ count: 0, until: null });
    toast.success("Welcome back");
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="font-display italic text-3xl text-primary text-center">Admin sign in</h1>
          <p className="text-xs text-muted-foreground text-center">Authorised personnel only · Indian Handicraft Standards</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 mt-6" autoComplete="off">
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            disabled={locked || submitting}
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background disabled:opacity-60"
          />
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={locked || submitting}
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background disabled:opacity-60"
          />
          <button
            disabled={submitting || locked}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {locked
              ? `Locked · retry in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : submitting
                ? "Verifying…"
                : "Sign in securely"}
          </button>
        </form>

        <div className="mt-5 text-[11px] text-muted-foreground text-center leading-relaxed">
          <p>Sessions are encrypted and rate-limited. All sign-in attempts are logged.</p>
          <p className="mt-1">Need access? Contact an existing administrator.</p>
        </div>
      </div>
    </div>
  );
}