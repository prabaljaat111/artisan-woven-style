import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogOut, Package, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { products } from "@/data/products";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Indian Handicraft Standards" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const ADMIN_PASSWORD = "ihs2025";
const STORAGE_KEY = "ihs-admin-auth";

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"dashboard" | "products" | "orders">("dashboard");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1") setAuthed(true);
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pw === ADMIN_PASSWORD) {
              sessionStorage.setItem(STORAGE_KEY, "1");
              setAuthed(true);
            } else setErr("Wrong password");
          }}
          className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-lg"
        >
          <div className="text-center mb-5">
            <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center"><Lock className="h-5 w-5 text-primary" /></div>
            <h1 className="font-display italic text-2xl text-primary mt-3">Admin Login</h1>
            <p className="text-xs text-muted-foreground mt-1">Indian Handicraft Standards</p>
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            placeholder="Password"
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-background"
            autoFocus
          />
          {err && <p className="text-xs text-destructive mt-2">{err}</p>}
          <button className="w-full mt-4 bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium hover:bg-primary/90">Sign in</button>
          <p className="text-[11px] text-muted-foreground text-center mt-3">Demo password: <code className="font-mono">ihs2025</code></p>
        </form>
      </div>
    );
  }

  const stats = [
    { label: "Revenue (30d)", value: "₹2,48,500", icon: TrendingUp },
    { label: "Orders (30d)", value: "187", icon: ShoppingBag },
    { label: "Products", value: String(products.length), icon: Package },
    { label: "Customers", value: "1,204", icon: Users },
  ];
  const orders = Array.from({ length: 8 }).map((_, i) => ({
    id: `IHS-${10240 + i}`,
    customer: ["Priya Sharma", "Anjali Mehta", "Meena Kapoor", "Riya Patel"][i % 4],
    total: 999 + i * 350,
    status: ["Pending", "Packed", "Shipped", "Delivered"][i % 4],
    date: `2026-05-${20 + (i % 6)}`,
  }));

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-primary text-primary-foreground px-4 md:px-8 py-4 flex items-center justify-between">
        <div>
          <div className="font-display italic text-xl">Indian Handicraft Standards</div>
          <div className="text-[11px] opacity-80">Admin Dashboard</div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setAuthed(false); }}
          className="inline-flex items-center gap-2 text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full px-3 py-1.5"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </header>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <nav className="flex gap-2 mb-6 overflow-x-auto">
          {(["dashboard", "products", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm capitalize whitespace-nowrap ${tab === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                  <s.icon className="h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground mt-3">{s.label}</p>
                  <p className="font-display text-2xl text-primary mt-1">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-display text-lg text-primary mb-3">Recent activity</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between border-b border-border/60 pb-2"><span>New order IHS-10247</span><span className="text-muted-foreground">2 min ago</span></li>
                <li className="flex justify-between border-b border-border/60 pb-2"><span>Stock low: Maroon Festive Kurta Set</span><span className="text-muted-foreground">1 hr ago</span></li>
                <li className="flex justify-between border-b border-border/60 pb-2"><span>3 wishlist additions</span><span className="text-muted-foreground">3 hr ago</span></li>
                <li className="flex justify-between"><span>Newsletter: 12 new subscribers today</span><span className="text-muted-foreground">today</span></li>
              </ul>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-foreground/70 text-xs uppercase tracking-wider">
                  <tr><th className="text-left p-3">Product</th><th className="text-left p-3">Category</th><th className="text-right p-3">Price</th><th className="text-right p-3">Stock</th></tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3 flex items-center gap-3">
                        <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                        <span className="line-clamp-1">{p.name}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{p.category}</td>
                      <td className="p-3 text-right">₹{p.price.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right"><span className={`text-xs px-2 py-0.5 rounded-full ${p.inStock ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{p.inStock ? "In stock" : "Out"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-foreground/70 text-xs uppercase tracking-wider">
                  <tr><th className="text-left p-3">Order</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Date</th><th className="text-right p-3">Total</th><th className="text-right p-3">Status</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="p-3 font-mono text-xs">{o.id}</td>
                      <td className="p-3">{o.customer}</td>
                      <td className="p-3 text-muted-foreground">{o.date}</td>
                      <td className="p-3 text-right">₹{o.total.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right"><span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}