import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, stockChip, inputCls, btnPrimary } from "@/components/admin/ui";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
  head: () => ({ meta: adminPageMeta("Inventory") }),
});

function InventoryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [adj, setAdj] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState("");

  const products = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, sku, stock, reorder_level, low_stock_threshold, images, status").order("stock");
      if (error) throw error;
      return data;
    },
  });
  const logs = useQuery({
    queryKey: ["stock_logs"],
    queryFn: async () => (await supabase.from("stock_logs").select("id, adjustment_type, quantity, previous_stock, new_stock, reason, created_at, products(name)").order("created_at", { ascending: false }).limit(15)).data ?? [],
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!adj || !user) return;
      const next = Math.max(0, adj.stock + qty);
      const { error } = await supabase.from("products").update({ stock: next }).eq("id", adj.id);
      if (error) throw error;
      await supabase.from("stock_logs").insert({ product_id: adj.id, adjustment_type: qty >= 0 ? "increase" : "decrease", quantity: Math.abs(qty), previous_stock: adj.stock, new_stock: next, reason: reason || null, user_id: user.id });
    },
    onSuccess: () => { toast.success("Stock updated"); setAdj(null); setQty(0); setReason(""); qc.invalidateQueries({ queryKey: ["inventory"] }); qc.invalidateQueries({ queryKey: ["stock_logs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = (products.data ?? []).filter((p: any) => {
    const lvl = p.reorder_level ?? p.low_stock_threshold ?? 5;
    return filter === "all" ? true : filter === "out" ? p.stock <= 0 : p.stock > 0 && p.stock <= lvl;
  });

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track stock levels and adjust quantities with a full history." />
      <div className="flex gap-2 mb-4">
        {(["all", "low", "out"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`h-9 px-4 rounded-full text-sm ${filter === f ? "bg-admin-nav text-admin-nav-foreground" : "bg-card border border-border"}`}>{f === "all" ? "All" : f === "low" ? "Low Stock" : "Out of Stock"}</button>
        ))}
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {rows.map((p: any) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.sku ?? "—"}</td>
                  <td className="p-3 tabular-nums">{p.stock}</td>
                  <td className="p-3">{stockChip(p.stock, p.reorder_level ?? 5)}</td>
                  <td className="p-3 text-right"><button className="text-sm text-admin-nav underline" onClick={() => setAdj({ id: p.id, name: p.name, stock: p.stock })}>Adjust</button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No products.</td></tr>}
            </tbody>
          </table>
        </Card>
        <div className="space-y-4">
          {adj && (
            <Card className="p-5 space-y-3">
              <h3 className="font-display text-lg">Adjust: {adj.name}</h3>
              <div className="text-sm text-muted-foreground">Current stock: {adj.stock}</div>
              <input type="number" className={`${inputCls} w-full`} value={qty} onChange={(e) => setQty(Number(e.target.value))} placeholder="+10 or -2" />
              <input className={`${inputCls} w-full`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (restock, damaged…)" />
              <div className="flex gap-2"><button className={btnPrimary} disabled={!qty || adjust.isPending} onClick={() => adjust.mutate()}>Save → {Math.max(0, adj.stock + qty)}</button><button className="text-sm" onClick={() => setAdj(null)}>Cancel</button></div>
            </Card>
          )}
          <Card className="p-5">
            <h3 className="font-display text-lg mb-3">Stock history</h3>
            <div className="space-y-2 text-sm">
              {(logs.data ?? []).length === 0 && <div className="text-muted-foreground">No adjustments yet.</div>}
              {(logs.data ?? []).map((l: any) => (
                <div key={l.id} className="flex justify-between gap-2 border-b border-border/50 pb-2">
                  <div><div className="font-medium">{l.products?.name}</div><div className="text-xs text-muted-foreground">{l.reason ?? l.adjustment_type} · {format(new Date(l.created_at), "d MMM, HH:mm")}</div></div>
                  <div className={`tabular-nums ${l.adjustment_type === "increase" ? "text-status-green" : "text-status-red"}`}>{l.previous_stock} → {l.new_stock}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
