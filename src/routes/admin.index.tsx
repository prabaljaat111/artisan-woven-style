import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, startOfMonth, endOfDay, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  IndianRupee, ShoppingCart, BarChart3, Package, ArrowUp, ArrowDown, CalendarIcon, Download, ChevronDown,
  Plus, FileText, Boxes, Tag, MoreHorizontal, AlertCircle, Truck, RotateCcw, MessageCircle, ArrowRight,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, Chip, inr } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
  head: () => ({ meta: adminPageMeta("Store Overview") }),
});

type Overview = {
  current: { sales: number; orders: number };
  previous: { sales: number; orders: number };
  low_stock: number;
  status: Record<string, number>;
  awaiting_dispatch: number;
  returns: number;
  new_messages: number;
  top_products: { name: string; image: string | null; price: number; sold: number }[];
};

const STATUS_GROUPS = [
  { key: "Delivered", from: ["delivered"], color: "var(--status-green)" },
  { key: "Processing", from: ["pending", "paid"], color: "var(--admin-pill)" },
  { key: "Shipped", from: ["shipped"], color: "var(--status-blue)" },
  { key: "Cancelled", from: ["cancelled"], color: "var(--status-red)" },
  { key: "Returned", from: ["refunded"], color: "var(--muted-foreground)" },
];
const ORDER_CHIP: Record<string, { tone: "green" | "orange" | "red" | "blue" | "gray"; label: string }> = {
  delivered: { tone: "green", label: "Delivered" }, shipped: { tone: "blue", label: "Shipped" },
  paid: { tone: "orange", label: "Processing" }, pending: { tone: "orange", label: "Pending" },
  cancelled: { tone: "red", label: "Cancelled" }, refunded: { tone: "gray", label: "Returned" },
};

const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));
const compact = (n: number) => (n >= 1000 ? `₹${Math.round(n / 1000)}K` : `₹${n}`);

function DashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const canSee = role === "admin" || role === "manager";
  const [range, setRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const [days, setDays] = useState(20);
  const from = startOfDay(range?.from ?? startOfMonth(new Date()));
  const to = endOfDay(range?.to ?? range?.from ?? new Date());

  const overview = useQuery({
    queryKey: ["dash-overview", from.toISOString(), to.toISOString()],
    enabled: canSee,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_overview", { _from: from.toISOString(), _to: to.toISOString() });
      if (error) throw error;
      return data as unknown as Overview;
    },
  });
  const trend = useQuery({
    queryKey: ["dash-trend", days],
    enabled: canSee,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_sales_trend", { _days: days });
      if (error) throw error;
      return (data ?? []).map((d) => ({ day: format(new Date(d.day), "MMM d"), sales: Number(d.sales) }));
    },
  });
  const recent = useQuery({
    queryKey: ["dash-recent"],
    enabled: canSee,
    queryFn: async () => (await supabase.from("orders").select("id, order_number, created_at, customer_name, total, status, order_items(qty)").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  if (!authLoading && !canSee) {
    return (
      <div>
        <h1 className="font-display text-3xl text-admin-nav">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Use Products, Inventory and Approvals from the menu.</p>
        <div className="flex gap-3 mt-5">
          <Link to="/admin/products" className="h-10 px-4 rounded-lg bg-admin-nav text-admin-nav-foreground text-sm grid place-items-center">Add product</Link>
          <Link to="/admin/inventory" className="h-10 px-4 rounded-lg border border-border bg-card text-sm grid place-items-center">Update stock</Link>
        </div>
      </div>
    );
  }

  const o = overview.data;
  const aov = o && o.current.orders ? o.current.sales / o.current.orders : 0;
  const prevAov = o && o.previous.orders ? o.previous.sales / o.previous.orders : 0;
  const statusData = STATUS_GROUPS.map((g) => ({ ...g, value: g.from.reduce((s, k) => s + (o?.status?.[k] ?? 0), 0) }));
  const statusTotal = statusData.reduce((s, d) => s + d.value, 0);

  function exportCsv() {
    if (!o) return;
    const rows = [
      ["Indian Handicraft Standards — Store Overview"],
      ["Period", `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`],
      [], ["Metric", "Value"],
      ["Total Sales", o.current.sales], ["Total Orders", o.current.orders], ["Average Order Value", aov.toFixed(2)], ["Low Stock Products", o.low_stock],
      [], ["Order status", "Count"], ...statusData.map((s) => [s.key, s.value]),
      [], ["Top product", "Units sold", "Price"], ...o.top_products.map((p) => [p.name, p.sold, p.price]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ihs-store-overview-${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
    a.click();
  }
  function exportPdf() {
    if (!o) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>IHS Store Overview</title><style>body{font-family:Inter,sans-serif;padding:32px;color:#0B3D2E}h1{font-family:'Playfair Display',serif}td,th{padding:6px 12px;border-bottom:1px solid #eee;text-align:left}</style></head><body>
      <h1>Store Overview</h1><p>${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}</p>
      <table><tr><th>Total Sales</th><td>${inr(o.current.sales)}</td></tr><tr><th>Total Orders</th><td>${o.current.orders}</td></tr><tr><th>Average Order Value</th><td>${inr(aov.toFixed(0))}</td></tr><tr><th>Low Stock Products</th><td>${o.low_stock}</td></tr></table>
      <h3>Order status</h3><table>${statusData.map((s) => `<tr><td>${s.key}</td><td>${s.value}</td></tr>`).join("")}</table>
      <h3>Top selling products</h3><table>${o.top_products.map((p, i) => `<tr><td>${i + 1}. ${p.name}</td><td>${p.sold} sold</td><td>${inr(p.price)}</td></tr>`).join("")}</table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-admin-nav">Store Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening with your store.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-11 px-4 rounded-lg border border-border bg-card text-sm flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(from, "MMM d, yyyy")} – {format(to, "MMM d, yyyy")}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} disabled={{ after: new Date() }} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button disabled={!o} className="h-11 px-5 rounded-lg bg-admin-nav text-admin-nav-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50"><Download className="h-4 w-4" /> Export Report</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>Download CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>Save as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {!o ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
          <>
            <Kpi icon={IndianRupee} tint="bg-status-green/10 text-status-green" label="Total Sales" value={inr(Math.round(o.current.sales))} change={pct(o.current.sales, o.previous.sales)} />
            <Kpi icon={ShoppingCart} tint="bg-status-orange/10 text-status-orange" label="Total Orders" value={o.current.orders.toLocaleString("en-IN")} change={pct(o.current.orders, o.previous.orders)} />
            <Kpi icon={BarChart3} tint="bg-status-blue/10 text-status-blue" label="Average Order Value" value={inr(Math.round(aov))} change={pct(aov, prevAov)} />
            <Link to="/admin/inventory" className="block">
              <Kpi icon={Package} tint="bg-status-red/10 text-status-red" label="Low Stock Products" value={String(o.low_stock)} note="need attention" />
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Sales Trend</h2>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 px-2 rounded-lg border border-border bg-card text-sm">
              <option value={7}>Last 7 Days</option><option value={20}>Last 20 Days</option><option value={30}>Last 30 Days</option>
            </select>
          </div>
          {trend.isLoading ? <Skeleton className="h-56" /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.data} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--status-green)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--status-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Area type="monotone" dataKey="sales" stroke="var(--admin-nav)" strokeWidth={2.5} fill="url(#salesFill)" dot={{ r: 2.5, fill: "var(--admin-nav)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl mb-3">Order Status</h2>
          {!o ? <Skeleton className="h-56" /> : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusTotal ? statusData : [{ key: "none", value: 1, color: "var(--muted)" }]} dataKey="value" nameKey="key" innerRadius={52} outerRadius={78} paddingAngle={statusTotal ? 2 : 0} stroke="none">
                      {(statusTotal ? statusData : [{ color: "var(--muted)" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
                  <div><div className="text-2xl font-semibold">{statusTotal}</div><div className="text-xs text-muted-foreground">Orders</div></div>
                </div>
              </div>
              <ul className="flex-1 w-full space-y-2 text-sm">
                {statusData.map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1">{s.key}</span>
                    <span className="tabular-nums">{s.value} <span className="text-muted-foreground">({statusTotal ? Math.round((s.value / statusTotal) * 100) : 0}%)</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction to="/admin/products" icon={Plus} title="Add Product" sub="Create new product" primary />
            <QuickAction to="/admin/orders" icon={FileText} title="Manage Orders" sub="View and process" />
            <QuickAction to="/admin/inventory" icon={Boxes} title="Update Stock" sub="Manage inventory" />
            <QuickAction to="/admin/coupons" icon={Tag} title="Create Coupon" sub="Run offers & discounts" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-admin-nav flex items-center gap-1">View All Orders <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-left text-xs text-muted-foreground bg-secondary/40">
                <tr><th className="p-2.5">Order ID</th><th className="p-2.5">Date</th><th className="p-2.5">Customer</th><th className="p-2.5">Items</th><th className="p-2.5">Amount</th><th className="p-2.5">Status</th><th className="p-2.5" /></tr>
              </thead>
              <tbody>
                {recent.isLoading && [0, 1, 2, 3, 4].map((i) => <tr key={i}><td colSpan={7} className="p-2"><Skeleton className="h-6" /></td></tr>)}
                {!recent.isLoading && (recent.data ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>}
                {(recent.data ?? []).map((r: any) => {
                  const items = (r.order_items ?? []).reduce((s: number, i: any) => s + i.qty, 0);
                  const chip = ORDER_CHIP[r.status] ?? { tone: "gray" as const, label: r.status };
                  return (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="p-2.5 font-semibold whitespace-nowrap">#{r.order_number}</td>
                      <td className="p-2.5 whitespace-nowrap">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                      <td className="p-2.5">{r.customer_name}</td>
                      <td className="p-2.5 whitespace-nowrap">{items} item{items === 1 ? "" : "s"}</td>
                      <td className="p-2.5">{inr(r.total)}</td>
                      <td className="p-2.5"><Chip tone={chip.tone}>{chip.label}</Chip></td>
                      <td className="p-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label="Order actions" className="h-7 w-7 grid place-items-center rounded hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link to="/admin/orders">View order</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link to="/admin/shipments">Create shipment</Link></DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl mb-3">Alerts & Notifications</h2>
          {!o ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div> : (
            <div className="space-y-2.5">
              <Alert icon={AlertCircle} tone="red" title={`${o.low_stock} products low in stock`} sub="Some products are running low. Please update stock." to="/admin/low-stock" cta="View Products" />
              <Alert icon={Truck} tone="orange" title={`${o.awaiting_dispatch} orders awaiting dispatch`} sub="These orders are paid and ready to be shipped." to="/admin/shipments" cta="View Orders" />
              <Alert icon={RotateCcw} tone="blue" title={`${o.returns} return request${o.returns === 1 ? "" : "s"}`} sub="Refunded or returned orders in this period." to="/admin/orders" cta="View Requests" />
              <Alert icon={MessageCircle} tone="green" title={`${o.new_messages} new customer messages`} sub="New enquiries from website and WhatsApp." to="/admin/leads" cta="View Messages" />
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Top Selling Products</h2>
          <Link to="/admin/products" className="text-sm text-admin-nav flex items-center gap-1">View All Products <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {!o ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />) : o.top_products.length === 0 ? (
            <div className="col-span-full text-sm text-muted-foreground py-6 text-center">No sales in this period.</div>
          ) : o.top_products.map((p, i) => (
            <div key={p.name} className="flex gap-3 p-2.5 rounded-xl border border-border/60">
              <div className="relative h-24 w-20 shrink-0 rounded-lg bg-secondary overflow-hidden">
                {p.image && <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                <span className="absolute top-1 left-1 h-6 w-6 rounded-md bg-admin-pill text-admin-pill-foreground text-xs font-semibold grid place-items-center">{i + 1}</span>
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.sold} sold</div>
                <div className="font-display text-lg mt-auto">{inr(p.price)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, tint, label, value, change, note }: { icon: any; tint: string; label: string; value: string; change?: number; note?: string }) {
  const up = (change ?? 0) >= 0;
  return (
    <Card className="p-5 flex gap-4 items-start h-full">
      <div className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 ${tint}`}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl md:text-3xl font-display font-semibold">{value}</span>
          {change !== undefined && (
            <span className={`flex items-center text-xs font-medium ${up ? "text-status-green" : "text-status-red"}`}>
              {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}{Math.abs(change)}%
            </span>
          )}
        </div>
        <div className={`text-xs ${note ? "text-status-red" : "text-muted-foreground"}`}>{note ?? "vs. previous period"}</div>
      </div>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, title, sub, primary }: { to: string; icon: any; title: string; sub: string; primary?: boolean }) {
  return (
    <Link to={to as any} className={`rounded-xl p-3 flex gap-2.5 items-start min-h-20 transition hover:-translate-y-0.5 ${primary ? "bg-admin-nav text-admin-nav-foreground" : "bg-admin-pill/40 text-foreground"}`}>
      <span className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${primary ? "border border-admin-nav-foreground/60" : "bg-card"}`}><Icon className="h-4 w-4" /></span>
      <span><span className="block text-sm font-semibold">{title}</span><span className={`block text-xs ${primary ? "opacity-80" : "text-muted-foreground"}`}>{sub}</span></span>
    </Link>
  );
}

const ALERT_TONE = {
  red: { box: "bg-status-red/5 border-status-red/20", icon: "text-status-red", btn: "bg-status-red/10 text-status-red" },
  orange: { box: "bg-status-orange/5 border-status-orange/20", icon: "text-status-orange", btn: "bg-status-orange/10 text-status-orange" },
  blue: { box: "bg-status-blue/5 border-status-blue/20", icon: "text-status-blue", btn: "bg-status-blue/10 text-status-blue" },
  green: { box: "bg-status-green/5 border-status-green/20", icon: "text-status-green", btn: "bg-status-green/10 text-status-green" },
};

function Alert({ icon: Icon, tone, title, sub, to, cta }: { icon: any; tone: keyof typeof ALERT_TONE; title: string; sub: string; to: string; cta: string }) {
  const t = ALERT_TONE[tone];
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${t.box}`}>
      <Icon className={`h-6 w-6 shrink-0 ${t.icon}`} />
      <div className="flex-1 min-w-0"><div className={`text-sm font-semibold ${t.icon}`}>{title}</div><div className="text-xs text-muted-foreground">{sub}</div></div>
      <Link to={to as any} className={`shrink-0 h-8 px-3 rounded-lg text-xs font-medium grid place-items-center ${t.btn}`}>{cta}</Link>
    </div>
  );
}
