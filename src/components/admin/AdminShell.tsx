import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Percent, Star, LogOut, FolderTree, Truck, Settings,
  Boxes, RotateCcw, CreditCard, Megaphone, BarChart3, ShoppingCart, MessageCircle, FileText, Image as ImageIcon,
  ShieldCheck, DatabaseBackup, ChevronDown, Search, Bell, HelpCircle, Menu, X, Inbox,
} from "lucide-react";
import { useAuth, type TeamRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { TwoFactorSettings } from "@/components/admin/TwoFactorSettings";

type NavItem = {
  label: string;
  icon: any;
  to: string;
  params?: Record<string, string>;
  exact?: boolean;
  roles?: TeamRole[]; // omitted = admin only
  badge?: "orders";
  children?: (Omit<NavItem, "icon" | "children"> & { search?: Record<string, unknown> })[];
};

const ALL: TeamRole[] = ["admin", "manager", "staff"];
const MGR: TeamRole[] = ["admin", "manager"];
const ph = (slug: string) => ({ to: "/admin/$", params: { _splat: slug } });

const NAV: NavItem[][] = [
  [
    { label: "Dashboard", icon: LayoutDashboard, to: "/admin", exact: true, roles: ALL },
    {
      label: "Products", icon: Package, to: "/admin/products", roles: ALL,
      children: [
        { label: "All Products", to: "/admin/products", roles: ALL },
        { label: "Add New Product", to: "/admin/products/new", roles: ALL },
        { label: "Categories", to: "/admin/categories" },
        { label: "Attributes (Size, Color)", to: "/admin/attributes", roles: ALL },
        { label: "Brands", to: "/admin/brands", roles: ALL },
        { label: "Bulk Import/Export", to: "/admin/products/bulk", roles: ALL },
        { label: "Drafts & Pending", to: "/admin/products/drafts", roles: ALL },
        { label: "Product Approvals", to: "/admin/approvals", roles: MGR },
      ],
    },
    { label: "Categories", icon: FolderTree, to: "/admin/categories" },
    {
      label: "Inventory", icon: Boxes, to: "/admin/inventory", roles: ALL,
      children: [
        { label: "Stock Levels", to: "/admin/inventory", roles: ALL },
        { label: "Low Stock", to: "/admin/low-stock", roles: ALL },
      ],
    },
    { label: "Orders", icon: ShoppingBag, to: "/admin/orders", badge: "orders" },
    { label: "Returns & Refunds", icon: RotateCcw, to: "/admin/returns" },
    { label: "Customers", icon: Users, to: "/admin/customers" },
    { label: "Payments", icon: CreditCard, to: "/admin/settings/payment" },
    { label: "Shipping", icon: Truck, to: "/admin/shipments" },
    { label: "Coupons & Offers", icon: Percent, to: "/admin/coupons" },
    { label: "Marketing", icon: Megaphone, to: "/admin/leads" },
    { label: "Reviews", icon: Star, to: "/admin/reviews" },
    { label: "Analytics & Reports", icon: BarChart3, to: "/admin/settings/analytics" },
  ],
  [
    { label: "Google Merchant Center", icon: ShoppingCart, to: "/admin/google-merchant", roles: MGR },
    { label: "Meta & WhatsApp Catalog", icon: MessageCircle, to: "/admin/meta-catalog", roles: MGR },
    { label: "Website Pages", icon: FileText, to: "/admin/settings/website" },
    { label: "Media Library", icon: ImageIcon, to: "/admin/media", roles: ALL },
    { label: "Staff & Permissions", icon: ShieldCheck, to: "/admin/staff" },
    { label: "Settings", icon: Settings, to: "/admin/settings", exact: true },
    { label: "Backups & Security", icon: DatabaseBackup, to: "/admin/settings/backup" },
  ],
];

const allowed = (role: TeamRole | null | undefined, roles?: TeamRole[]) => !!role && (roles ?? ["admin"]).includes(role);

export function AdminShell() {
  const navigate = useNavigate();
  const { loading, user, role, isTeam } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawer, setDrawer] = useState(false);
  const [counts, setCounts] = useState({ orders: 0, alerts: 0 });
  const [mfaRequired,setMfaRequired]=useState(false);
  useEffect(()=>{if(!isTeam)return;supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({data})=>setMfaRequired(data?.nextLevel==='aal2'&&data?.currentLevel!=='aal2'));},[isTeam]);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login", replace: true });
      else if (!isTeam) {
        toast.error("You don't have admin access");
        navigate({ to: "/", replace: true });
      }
    }
  }, [loading, user, isTeam, navigate]);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    if (!isTeam) return;
    (async () => {
      const [o, a] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "paid"]),
        supabase.from("stock_alerts").select("id", { count: "exact", head: true }).eq("acknowledged", false),
      ]);
      setCounts({ orders: o.count ?? 0, alerts: a.count ?? 0 });
    })();
  }, [isTeam]);

  if (loading || !user || !isTeam) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Checking access…</div>;
  }
  if(mfaRequired) return <div className="admin-ui min-h-screen bg-admin-canvas flex items-center justify-center p-5"><div className="max-w-lg w-full space-y-4"><h1 className="font-display text-3xl text-primary">Verify your sign-in</h1><TwoFactorSettings challengeOnly onVerified={()=>setMfaRequired(false)}/></div></div>;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-admin-nav text-admin-nav-foreground">
      <div className="px-5 pt-6 pb-5 text-center border-b border-admin-nav-foreground/10">
        <div className="font-display text-3xl tracking-wide text-admin-pill">IHS</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-admin-nav-foreground/80 mt-1">Indian Handicraft Standards</div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-admin-nav-foreground/50 mt-0.5">Lucknowi Chikankari Apparel</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV.map((group, gi) => (
          <div key={gi} className={`space-y-0.5 ${gi > 0 ? "pt-4 border-t border-admin-nav-foreground/10" : ""}`}>
            {group.filter((n) => allowed(role, n.roles)).map((n) => (
              <NavRow key={n.label} item={n} role={role} pathname={pathname} ordersBadge={counts.orders} />
            ))}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="admin-ui min-h-screen flex bg-admin-canvas text-foreground">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">{sidebar}</aside>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 h-full shadow-2xl">{sidebar}</div>
          <button aria-label="Close menu" className="flex-1 bg-foreground/40" onClick={() => setDrawer(false)} />
          <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute top-3 left-[17rem] h-9 w-9 rounded-full bg-card grid place-items-center"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-20 bg-admin-canvas/95 backdrop-blur border-b border-border flex items-center gap-3 px-4 md:px-6 h-16">
          <button aria-label="Open menu" className="lg:hidden h-9 w-9 grid place-items-center rounded-lg border border-border bg-card" onClick={() => setDrawer(true)}><Menu className="h-4 w-4" /></button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <NotificationBell userId={user.id} lowStockCount={counts.alerts} />
            <a href="mailto:support@indianhandicraftstandards.com" className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><HelpCircle className="h-4 w-4" /> Help</a>
            <UserMenu email={user.email ?? ""} role={role ?? "staff"} onLogout={logout} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden"><Outlet /></main>
      </div>
    </div>
  );
}

function NavRow({ item, role, pathname, ordersBadge }: { item: NavItem; role: TeamRole | null | undefined; pathname: string; ordersBadge: number }) {
  const href = item.params?._splat ? `/admin/${item.params._splat}` : item.to;
  const active = item.exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const kids = item.children?.filter((c) => allowed(role, c.roles));
  const childActive = kids?.some((c) => pathname === c.to);
  const [open, setOpen] = useState(!!childActive || active);
  const cls = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-admin-pill text-admin-pill-foreground font-medium shadow-sm" : "text-admin-nav-foreground/85 hover:bg-admin-nav-foreground/10"}`;

  if (kids?.length) {
    return (
      <div>
        <button onClick={() => setOpen((o) => !o)} className={`${cls} w-full`}>
          <item.icon className="h-4 w-4 shrink-0" /> <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="ml-7 mt-0.5 border-l border-admin-nav-foreground/15 pl-2 space-y-0.5">
            {kids.map((c) => (
              <Link key={c.label} to={c.to as any} search={c.search as any} className={`block px-3 py-1.5 rounded-md text-[13px] ${pathname === c.to && c.label !== "Add New Product" && c.label !== "Bulk Import/Export" ? "text-admin-pill font-medium" : "text-admin-nav-foreground/70 hover:text-admin-nav-foreground"}`}>{c.label}</Link>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <Link to={item.to as any} params={item.params as any} className={cls}>
      <item.icon className="h-4 w-4 shrink-0" /> <span className="flex-1">{item.label}</span>
      {item.badge === "orders" && ordersBadge > 0 && <span className="h-5 min-w-5 px-1.5 rounded-full bg-admin-pill text-admin-pill-foreground text-[11px] font-semibold grid place-items-center">{ordersBadge}</span>}
    </Link>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ type: string; label: string; sub: string; to: string }[]>([]);
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(t.current);
    const term = q.trim().replace(/[%,()]/g, "");
    if (term.length < 2) { setRes([]); return; }
    t.current = setTimeout(async () => {
      const like = `%${term}%`;
      const [p, o, c] = await Promise.all([
        supabase.from("products").select("id, name, sku, slug").is("deleted_at", null).or(`name.ilike.${like},sku.ilike.${like}`).limit(5),
        supabase.from("orders").select("id, order_number, customer_name").or(`order_number.ilike.${like},customer_name.ilike.${like}`).limit(5),
        supabase.from("profiles").select("full_name, phone").ilike("full_name", like).limit(5),
      ]);
      setRes([
        ...(p.data ?? []).map((x) => ({ type: "Product", label: x.name, sub: x.sku ?? x.slug, to: `/admin/products/${x.id}` })),
        ...(o.data ?? []).map((x) => ({ type: "Order", label: x.order_number, sub: x.customer_name, to: `/admin/orders/${x.id}` })),
        ...(c.data ?? []).map((x) => ({ type: "Customer", label: x.full_name ?? "—", sub: x.phone ?? "", to: "/admin/customers" })),
      ]);
      setOpen(true);
    }, 250);
  }, [q]);

  return (
    <div className="relative flex-1 max-w-xl">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => res.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search products, orders, customers…" className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-ring/30" />
      {open && q.trim().length >= 2 && (
        <div className="absolute mt-1 w-full bg-card border border-border rounded-xl shadow-[var(--shadow-admin-card)] overflow-hidden z-40">
          {res.length === 0 ? <div className="p-3 text-sm text-muted-foreground">No matches</div> : res.map((r, i) => (
            <Link key={i} to={r.to as any} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary text-sm">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-16">{r.type}</span>
              <span className="font-medium truncate">{r.label}</span>
              <span className="text-xs text-muted-foreground truncate ml-auto">{r.sub}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ email, role, onLogout }: { email: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)} className="flex items-center gap-2 pl-2 md:border-l border-border">
        <span className="h-9 w-9 rounded-full bg-admin-nav text-admin-pill grid place-items-center font-semibold uppercase">{email[0]}</span>
        <span className="hidden md:block text-left leading-tight">
          <span className="block text-sm font-medium capitalize">{role}</span>
          <span className="block text-xs text-muted-foreground">IHS Store</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-[var(--shadow-admin-card)] p-1 z-40">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{email}</div>
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary"><Inbox className="h-4 w-4" /> View store</Link>
          <button onMouseDown={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary text-status-red"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
      )}
    </div>
  );
}

