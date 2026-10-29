import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, SlidersHorizontal, Download, Package, CheckCircle2, AlertTriangle, XCircle, Loader2, Check, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Chip, inputCls, btnPrimary, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjustStockModal, adjustStock } from "@/components/admin/AdjustStockModal";
import { StockHistory } from "@/components/admin/StockHistory";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
  head: () => ({ meta: adminPageMeta("Inventory & Stock") }),
});

type Row = { key: string; productId: string; variantId: string | null; name: string; image: string | null; sku: string | null; size: string | null; color: string | null; stock: number; reorder: number; categoryId: string | null; inactive: boolean };
type State = "in" | "low" | "out";
const stateOf = (r: Row): State => (r.stock <= 0 ? "out" : r.stock <= r.reorder ? "low" : "in");
const PAGE = 20;

function InventoryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<"all" | State>("all");
  const [page, setPage] = useState(1);
  const [adj, setAdj] = useState<Row | null>(null);
  const [adjOpen, setAdjOpen] = useState(false);
  const [tab, setTab] = useState<"stock" | "history">("stock");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["inventory-v2"],
    queryFn: async () => {
      const [{ data: prods, error }, { data: vars, error: variantError }, { data: cats, error: categoryError }] = await Promise.all([
        supabase.from("products").select("id, name, sku, stock, reorder_level, images, category_id, product_type").is("deleted_at", null).order("name"),
        supabase.from("product_variants").select("id, product_id, sku, size, color, stock, image_url, status, reorder_level").order("created_at"),
        supabase.from("categories").select("id, name").order("sort_order"),
      ]);
      if (error) throw error;
      if (variantError) throw variantError;
      if (categoryError) throw categoryError;
      const byProduct = new Map<string, any[]>();
      (vars ?? []).forEach((v) => { const a = byProduct.get(v.product_id) ?? []; a.push(v); byProduct.set(v.product_id, a); });
      const rows: Row[] = [];
      for (const p of prods ?? []) {
        const vs = byProduct.get(p.id);
        const base = { productId: p.id, name: p.name, categoryId: p.category_id, reorder: p.reorder_level ?? 5 };
        if (vs?.length) vs.forEach((v) => rows.push({ ...base, reorder: v.reorder_level ?? base.reorder, key: v.id, variantId: v.id, image: v.image_url || p.images?.[0] || null, sku: v.sku, size: v.size, color: v.color, stock: v.stock ?? 0, inactive: v.status === "inactive" }));
        else rows.push({ ...base, key: p.id, variantId: null, image: p.images?.[0] ?? null, sku: p.sku, size: null, color: null, stock: p.stock ?? 0, inactive: false });
      }
      return { rows, cats: cats ?? [] };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["inventory-v2"] }); qc.invalidateQueries({ queryKey: ["stock-history"] }); };

  const all = data?.rows ?? [];
  const summary = useMemo(() => ({ total: all.length, in: all.filter((r) => !r.inactive && stateOf(r) === "in").length, low: all.filter((r) => !r.inactive && stateOf(r) === "low").length, out: all.filter((r) => !r.inactive && stateOf(r) === "out").length }), [all]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => (!s || r.name.toLowerCase().includes(s) || (r.sku ?? "").toLowerCase().includes(s)) && (!cat || r.categoryId === cat) && (status === "all" || (!r.inactive && stateOf(r) === status)));
  }, [all, q, cat, status]);
  useEffect(() => setPage(1), [q, cat, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);
  const catName = (id: string | null) => data?.cats.find((c) => c.id === id)?.name ?? "";

  async function setStock(r: Row, next: number) {
    await adjustStock({ productId: r.productId, variationId: r.variantId, type: "set", quantity: next, reason: "Correction", notes: "Inline edit on Inventory page" });
    qc.setQueryData(["inventory-v2"], (old: any) => old && { ...old, rows: old.rows.map((x: Row) => (x.key === r.key ? { ...x, stock: next } : x)) });
    qc.invalidateQueries({ queryKey: ["stock-history"] });
  }

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Product", "SKU", "Size", "Color", "Category", "Stock", "Reorder Level", "Status"].join(",")];
    filtered.forEach((r) => lines.push([r.name, r.sku, r.size, r.color, catName(r.categoryId), r.stock, r.reorder, { in: "In Stock", low: "Low Stock", out: "Out of Stock" }[stateOf(r)]].map(esc).join(",")));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `inventory-${format(new Date(), "yyyy-MM-dd")}.csv` }); a.click(); URL.revokeObjectURL(url);
  }

  const cards = [
    { label: "Total SKUs", value: summary.total, icon: Package, tone: "text-foreground", f: "all" as const },
    { label: "In Stock", value: summary.in, icon: CheckCircle2, tone: "text-status-green", f: "in" as const },
    { label: "Low Stock", value: summary.low, icon: AlertTriangle, tone: "text-status-orange", f: "low" as const },
    { label: "Out of Stock", value: summary.out, icon: XCircle, tone: "text-status-red", f: "out" as const },
  ];

  return (
    <div>
      <PageHeader title="Inventory & Stock" subtitle="Every product and variation with live stock levels." actions={<><button className={btnGhost} onClick={() => { setAdj(null); setAdjOpen(true); }}><SlidersHorizontal className="h-4 w-4" /> Adjust Stock</button>{tab === "stock" && <button className={btnPrimary} onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4" /> Export Inventory</button>}</>} />
      <div className="flex gap-1 border-b border-border mb-5">
        {([["stock", "Stock Levels"], ["history", "Stock History"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === k ? "border-admin-nav font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>)}
      </div>
      {tab === "history" ? <StockHistory products={data?.rows ?? []} /> : <>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {cards.map((c) => (
          <button key={c.label} onClick={() => setStatus(c.f)} className={`text-left rounded-xl bg-card border p-4 shadow-sm transition ${status === c.f ? "border-admin-nav ring-1 ring-admin-nav" : "border-border hover:border-admin-nav/40"}`}>
            <div className="flex items-center justify-between text-sm text-muted-foreground">{c.label}<c.icon className={`h-4 w-4 ${c.tone}`} /></div>
            <div className={`mt-2 text-2xl font-semibold tabular-nums ${c.tone}`}>{isLoading ? <Skeleton className="h-7 w-12" /> : c.value.toLocaleString("en-IN")}</div>
          </button>
        ))}
      </div>

      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><input className={`${inputCls} w-full pl-9`} placeholder="Search product name or SKU" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} /></div>
        <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Stock status"><option value="all">All stock</option><option value="in">In Stock</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select>
      </Card>

      {loadError && <p role="alert" className="text-status-red mb-3">Inventory could not load: {loadError.message}</p>}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Size / Color</th><th className="p-3">Current Stock</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && [0, 1, 2, 3, 4].map((i) => <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-10" /></td></tr>)}
            {!isLoading && shown.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No items match these filters.</td></tr>}
            {shown.map((r) => {
              const st = stateOf(r);
              return (
                <tr key={r.key} className="border-t border-border/60 hover:bg-secondary/20">
                  <td className="p-3"><div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-secondary overflow-hidden grid place-items-center shrink-0">{r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}</div>
                    <div className="min-w-0"><div className="font-medium truncate max-w-[260px]">{r.name}</div><div className="text-xs text-muted-foreground">{catName(r.categoryId)}</div></div></div></td>
                  <td className="p-3 text-muted-foreground">{r.sku || "—"}</td>
                  <td className="p-3">{r.size || r.color ? [r.size, r.color].filter(Boolean).join(" / ") : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3"><StockInput row={r} onSave={(n) => setStock(r, n)} /></td>
                  <td className="p-3">{r.inactive ? <Chip tone="blue">Inactive</Chip> : st === "out" ? <Chip tone="red">Out of Stock</Chip> : st === "low" ? <Chip tone="orange">Low Stock</Chip> : <Chip tone="green">In Stock</Chip>}</td>
                  <td className="p-3 text-right"><button aria-label={`Adjust stock for ${r.name}`} title="Stock adjustment" className="p-2 rounded-md hover:bg-secondary" onClick={() => { setAdj(r); setAdjOpen(true); }}><SlidersHorizontal className="h-4 w-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Showing {(page - 1) * PAGE + 1} to {Math.min(page * PAGE, filtered.length)} of {filtered.length} items</span>
            <div className="flex gap-1">
              <button className={btnGhost} disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
              {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1).map((n, i, arr) => (
                <span key={n} className="flex gap-1">{i > 0 && n - arr[i - 1] > 1 && <span className="px-1 self-center">…</span>}
                  <button className={`h-9 min-w-9 px-2 rounded-lg text-sm ${n === page ? "bg-admin-nav text-admin-nav-foreground" : "border border-border bg-card"}`} onClick={() => setPage(n)}>{n}</button></span>
              ))}
              <button className={btnGhost} disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </Card>

      </>}
      <AdjustStockModal open={adjOpen} prefill={adj ? { productId: adj.productId, variationId: adj.variantId } : null} onClose={() => { setAdjOpen(false); setAdj(null); }} onDone={() => { setAdjOpen(false); setAdj(null); refresh(); }} />
    </div>
  );
}

function StockInput({ row, onSave }: { row: Row; onSave: (n: number) => Promise<void> }) {
  const [val, setVal] = useState(String(row.stock));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setVal(String(row.stock)), [row.stock]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function change(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 6);
    setVal(clean);
    clearTimeout(timer.current);
    if (clean === "" || Number(clean) === row.stock) return;
    timer.current = setTimeout(async () => {
      setState("saving");
      try { await onSave(Number(clean)); setState("saved"); setTimeout(() => setState("idle"), 1200); }
      catch (e: any) { toast.error(e.message); setVal(String(row.stock)); setState("idle"); }
    }, 800);
  }
  const low = row.stock <= row.reorder;
  return (
    <div className="flex items-center gap-2">
      <input aria-label="Stock quantity" inputMode="numeric" className={`${inputCls} h-8 w-20 tabular-nums ${low ? "text-status-red font-semibold" : ""}`} value={val} onChange={(e) => change(e.target.value)} onBlur={() => val === "" && setVal(String(row.stock))} />
      {state === "saving" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {state === "saved" && <Check className="h-4 w-4 text-status-green" />}
    </div>
  );
}

