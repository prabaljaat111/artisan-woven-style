import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardStats } from "@/lib/admin.functions";
import { ShoppingBag, Users, Package, IndianRupee, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
  head: () => ({ meta: adminPageMeta("Dashboard") }),
});

function DashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    getDashboardStats().then((s) => setStats(s)).finally(() => setLoading(false));
  }, [authLoading, isAdmin]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading dashboard…</div>;
  if (!stats) return <div className="text-sm text-muted-foreground">Unable to load stats.</div>;

  const max = Math.max(1, ...stats.daily.map((d: any) => d.revenue));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-primary">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Last 30 days overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={IndianRupee} label="Revenue (30d)" value={`₹${stats.revenue30.toLocaleString("en-IN")}`} />
        <Stat icon={ShoppingBag} label="Orders (30d)" value={stats.orders30} />
        <Stat icon={TrendingUp} label="AOV (30d)" value={`₹${stats.aov30.toLocaleString("en-IN")}`} />
        <Stat icon={Users} label="Customers" value={stats.customersTotal} />
        <Stat icon={Package} label="Products" value={stats.productsTotal} />
        <Stat icon={ShoppingBag} label="All Orders" value={stats.ordersTotal} />
        <Stat icon={Users} label="Leads" value={stats.leadsTotal ?? 0} />
        <Stat icon={AlertTriangle} label="Low stock" value={stats.lowStock?.length ?? 0} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-3">Revenue · last 14 days</div>
        <div className="flex items-end gap-1.5 h-40">
          {stats.daily.map((d: any) => (
            <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(d.revenue / max) * 100}%`, minHeight: "2px" }} title={`₹${d.revenue}`} />
              <div className="text-[9px] text-muted-foreground">{d.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Recent Orders</div>
            <Link to="/admin/orders" className="text-xs text-primary">View all →</Link>
          </div>
          <div className="space-y-2">
            {stats.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                <div>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-muted-foreground">{o.customer_name} · {format(new Date(o.created_at), "dd MMM")}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">₹{Number(o.total).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{o.status}</div>
                </div>
              </div>
            ))}
            {stats.recentOrders.length === 0 && <div className="text-xs text-muted-foreground">No orders yet.</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Low Stock</div>
            <Link to="/admin/products" className="text-xs text-primary">Manage →</Link>
          </div>
          <div className="space-y-2">
            {stats.lowStock.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 text-xs border-b border-border pb-2 last:border-0">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded" />}
                <div className="flex-1 truncate">{p.name}</div>
                <div className={`font-semibold ${p.stock === 0 ? "text-red-500" : "text-amber-500"}`}>{p.stock}</div>
              </div>
            ))}
            {stats.lowStock.length === 0 && <div className="text-xs text-muted-foreground">All stocked up.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="font-display text-2xl text-primary">{value}</div>
    </div>
  );
}