import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Users, Percent, Star, LogOut, Folder } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

const nav = [
  { to: "/_admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/_admin/products", label: "Products", icon: Package },
  { to: "/_admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/_admin/customers", label: "Customers", icon: Users },
  { to: "/_admin/categories", label: "Categories", icon: Folder },
  { to: "/_admin/coupons", label: "Coupons", icon: Percent },
  { to: "/_admin/reviews", label: "Reviews", icon: Star },
];

export function AdminShell() {
  const navigate = useNavigate();
  const { loading, user, isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login", replace: true });
      else if (!isAdmin) {
        toast.error("You don't have admin access");
        navigate({ to: "/", replace: true });
      }
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Checking access…</div>;
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-secondary/20">
      <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border">
        <div className="p-5 border-b border-border">
          <div className="font-display italic text-lg text-primary leading-tight">Indian Handicraft</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin Console</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground truncate mb-2">{user.email}</div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-xs bg-secondary hover:bg-secondary/70 rounded-md py-2"><LogOut className="h-3.5 w-3.5" /> Logout</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card">
          <div className="font-display text-primary">Admin</div>
          <button onClick={logout} className="text-xs px-3 py-1.5 bg-secondary rounded-full">Logout</button>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto p-2 bg-card border-b border-border">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>{n.label}</Link>
            );
          })}
        </nav>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden"><Outlet /></main>
      </div>
    </div>
  );
}