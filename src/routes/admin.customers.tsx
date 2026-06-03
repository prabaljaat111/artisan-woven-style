import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListCustomers } from "@/lib/admin.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function CustomersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    adminListCustomers().then(setRows).finally(() => setLoading(false));
  }, [authLoading, isAdmin]);

  const filtered = rows.filter((r) => !q || (r.full_name || "").toLowerCase().includes(q.toLowerCase()) || (r.email || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Customers</h1>
          <p className="text-xs text-muted-foreground">{rows.length} registered</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="text-sm border border-border rounded-md px-3 py-1.5 bg-background" />
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Phone</th><th className="text-right p-2">Orders</th><th className="text-right p-2">Spent</th><th className="text-left p-2">Joined</th><th className="text-left p-2">Last Login</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-2">{c.full_name || "—"}</td>
                  <td className="p-2 text-xs">{c.email || "—"}</td>
                  <td className="p-2 text-xs">{c.phone || "—"}</td>
                  <td className="p-2 text-right">{c.order_count}</td>
                  <td className="p-2 text-right">₹{Number(c.total_spent).toLocaleString("en-IN")}</td>
                  <td className="p-2 text-xs">{format(new Date(c.created_at), "dd MMM yy")}</td>
                  <td className="p-2 text-xs">{c.last_sign_in_at ? format(new Date(c.last_sign_in_at), "dd MMM yy") : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">No customers.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}