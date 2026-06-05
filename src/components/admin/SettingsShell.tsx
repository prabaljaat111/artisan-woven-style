import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Store, Globe, Package, Boxes, Receipt, CreditCard, Truck, Users, Megaphone,
  MessageCircle, Mail, Search, BarChart3, UserCog, ShieldCheck, Bell, DatabaseBackup,
  PieChart, Search as SearchIcon, Menu, X,
} from "lucide-react";

export type SettingsNavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; group: string; keywords: string[] };

export const SETTINGS_NAV: SettingsNavItem[] = [
  { to: "/admin/settings/general", label: "General", icon: Store, group: "Storefront", keywords: ["store name","logo","favicon","brand","contact","gst","address","social"] },
  { to: "/admin/settings/website", label: "Website", icon: Globe, group: "Storefront", keywords: ["homepage","hero","banner","footer","menu","navigation","sections"] },
  { to: "/admin/settings/seo", label: "SEO", icon: SearchIcon, group: "Storefront", keywords: ["meta","sitemap","robots","schema","open graph","og"] },
  { to: "/admin/settings/analytics", label: "Analytics", icon: BarChart3, group: "Storefront", keywords: ["ga4","gtm","pixel","conversion","tracking","google"] },

  { to: "/admin/settings/product", label: "Product", icon: Package, group: "Catalogue", keywords: ["default status","variant","size","color","sku","approval"] },
  { to: "/admin/settings/inventory", label: "Inventory", icon: Boxes, group: "Catalogue", keywords: ["stock","low stock","out of stock","backorder","alerts"] },

  { to: "/admin/settings/order", label: "Orders", icon: Receipt, group: "Operations", keywords: ["status","workflow","cod","cancellation","refund","return","exchange","invoice"] },
  { to: "/admin/settings/payment", label: "Payments", icon: CreditCard, group: "Operations", keywords: ["razorpay","stripe","upi","cod","gateway","transactions"] },
  { to: "/admin/settings/shipping", label: "Shipping", icon: Truck, group: "Operations", keywords: ["shiprocket","zone","charges","free shipping","awb","courier","delivery"] },

  { to: "/admin/settings/customer", label: "Customers", icon: Users, group: "Growth", keywords: ["registration","login","otp","wishlist","rewards","referral","groups"] },
  { to: "/admin/settings/marketing", label: "Marketing", icon: Megaphone, group: "Growth", keywords: ["coupon","discount","flash sale","festival","loyalty","abandoned cart"] },
  { to: "/admin/settings/whatsapp", label: "WhatsApp", icon: MessageCircle, group: "Growth", keywords: ["whatsapp","automated","order","shipping","lead","support"] },
  { to: "/admin/settings/email", label: "Email", icon: Mail, group: "Growth", keywords: ["smtp","welcome","newsletter","abandoned cart","contact form"] },
  { to: "/admin/settings/leads", label: "Leads", icon: UserCog, group: "Growth", keywords: ["lead","sources","assignment","status","crm"] },

  { to: "/admin/settings/security", label: "Security", icon: ShieldCheck, group: "System", keywords: ["roles","permissions","activity","login","2fa","api"] },
  { to: "/admin/settings/notifications", label: "Notifications", icon: Bell, group: "System", keywords: ["orders","leads","inventory","failed payments","messages","returns"] },
  { to: "/admin/settings/backup", label: "Backup & System", icon: DatabaseBackup, group: "System", keywords: ["backup","restore","health","logs"] },
  { to: "/admin/settings/reports", label: "Reports & BI", icon: PieChart, group: "System", keywords: ["sales","product","customer","inventory","revenue","conversion"] },
];

export function SettingsShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [openMobile, setOpenMobile] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SETTINGS_NAV;
    return SETTINGS_NAV.filter((n) =>
      n.label.toLowerCase().includes(needle) ||
      n.group.toLowerCase().includes(needle) ||
      n.keywords.some((k) => k.includes(needle)),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<string, SettingsNavItem[]>();
    for (const item of filtered) {
      const arr = m.get(item.group) ?? [];
      arr.push(item);
      m.set(item.group, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 -m-4 md:-m-6 min-h-[calc(100vh-3.5rem)]">
      {/* Mobile bar */}
      <div className="lg:hidden flex items-center gap-2 p-4 border-b border-border bg-card">
        <button onClick={() => setOpenMobile((v) => !v)} className="border border-border rounded-md p-2">
          {openMobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <div className="font-display text-primary">Settings</div>
      </div>

      {/* Sidebar */}
      <aside className={`${openMobile ? "block" : "hidden"} lg:block lg:w-64 shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto bg-card border-r border-border p-4`}>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search settings…"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>
        </div>
        <nav className="space-y-5">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 mb-1.5">{group}</div>
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = path === it.to || path.startsWith(it.to + "/");
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        onClick={() => setOpenMobile(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                      >
                        <it.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="text-xs text-muted-foreground px-2">No settings match "{q}"</div>
          )}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}