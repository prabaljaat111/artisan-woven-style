import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Pencil, SlidersHorizontal, ImageIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { Card, PageHeader, Chip, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjustStockModal } from "@/components/admin/AdjustStockModal";

export const Route = createFileRoute("/admin/low-stock")({
  component: LowStockPage,
  head: () => ({ meta: adminPageMeta("Low Stock Products") }),
});

type Item = { product_id: string; variation_id: string | null; name: string; image: string | null; sku: string | null; size: string | null; color: string | null; stock: number; reorder_level: number; category: string | null };

export const lowStockQuery = {
  queryKey: ["low-stock-items"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("low_stock_items");
    if (error) throw error;
    return ((data ?? []) as Item[]).sort((a, b) => a.stock - b.stock);
  },
};

function csvCell(v: unknown) { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

function LowStockPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(lowStockQuery);
  const [adj, setAdj] = useState<Item | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["low-stock-items"] }); qc.invalidateQueries({ queryKey: ["inventory-v2"] }); };

  const exportCsv = () => {
    const rows = [["Product", "Variation", "SKU", "Category", "Current Stock", "Reorder Level", "Suggested Order Qty", "Status"],
      ...data.map((i) => [i.name, [i.size, i.color].filter(Boolean).join(" / "), i.sku, i.category, i.stock, i.reorder_level, Math.max(i.reorder_level * 2 - i.stock, 1), i.stock <= 0 ? "Out of Stock" : "Low Stock"])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Low Stock Products" subtitle="Items at or below their reorder level." actions={<button className={btnGhost} onClick={exportCsv} disabled={!data.length}><Download className="h-4 w-4" /> Export low stock list</button>} />

      {!isLoading && data.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-status-red/30 bg-status-red/10 px-4 py-3 text-status-red">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">{data.length} {data.length === 1 ? "product is" : "products are"} low in stock. Please update inventory.</p>
          <Link to="/admin/inventory" className="h-9 px-3 inline-flex items-center rounded-lg bg-status-red text-primary-foreground text-sm font-medium">View All</Link>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-3">Image</th><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Current Stock</th><th className="p-3">Reorder Level</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-10 w-full" /></td></tr>)}
              {!isLoading && data.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">All items are above their reorder level. 🎉</td></tr>}
              {data.map((i) => (
                <tr key={i.variation_id ?? i.product_id} className="border-t border-border">
                  <td className="p-3">{i.image ? <img src={i.image} alt="" className="h-12 w-10 rounded object-cover" /> : <div className="h-12 w-10 rounded bg-secondary grid place-items-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>}</td>
                  <td className="p-3"><div className="font-medium">{i.name}</div><div className="text-xs text-muted-foreground">{[i.size, i.color].filter(Boolean).join(" / ") || i.category || "—"}</div></td>
                  <td className="p-3 font-mono text-xs">{i.sku || "—"}</td>
                  <td className="p-3 font-semibold text-status-red">{i.stock}</td>
                  <td className="p-3"><ReorderInput item={i} onSaved={refresh} /></td>
                  <td className="p-3">{i.stock <= 0 ? <Chip tone="red">Out of Stock</Chip> : <Chip tone="orange">Low Stock</Chip>}</td>
                  <td className="p-3"><div className="flex justify-end gap-2">
                    <button className={btnGhost} onClick={() => setAdj(i)} title="Quick stock update"><SlidersHorizontal className="h-4 w-4" /> Update</button>
                    <Link to="/admin/products/$id" params={{ id: i.product_id }} className={btnGhost} title="Edit product"><Pencil className="h-4 w-4" /></Link>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AdjustStockModal open={!!adj} prefill={adj ? { productId: adj.product_id, variationId: adj.variation_id } : null} onClose={() => setAdj(null)} onDone={() => { setAdj(null); refresh(); }} />
    </div>
  );
}

function ReorderInput({ item, onSaved }: { item: Item; onSaved: () => void }) {
  const [val, setVal] = useState(String(item.reorder_level));
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n > 100000) { toast.error("Reorder level must be a whole number"); setVal(String(item.reorder_level)); return; }
    if (n === item.reorder_level) return;
    const { error } = item.variation_id
      ? await supabase.from("product_variants").update({ reorder_level: n }).eq("id", item.variation_id)
      : await supabase.from("products").update({ reorder_level: n }).eq("id", item.product_id);
    if (error) { toast.error(error.message); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1500); onSaved();
  };
  return (
    <div className="flex items-center gap-1">
      <input type="number" min={0} value={val} onChange={(e) => setVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="h-8 w-20 px-2 rounded-md border border-border bg-card text-sm" aria-label="Reorder level" />
      {saved && <Check className="h-4 w-4 text-status-green" />}
    </div>
  );
}
