import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inputCls, btnPrimary, btnGhost } from "@/components/admin/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const STOCK_REASONS = ["New Stock Received", "Damaged", "Returned", "Sold Offline", "Correction", "Other"] as const;
export type AdjustType = "add" | "reduce" | "set";

export function computeNewStock(current: number, type: AdjustType, qty: number) {
  return type === "add" ? current + qty : type === "reduce" ? current - qty : qty;
}

/** Calls the transactional stock adjustment in the database (updates stock, writes log, raises low-stock alert). */
export async function adjustStock(args: { productId: string; variationId: string | null; type: AdjustType; quantity: number; reason: string; notes?: string | null }) {
  const { data, error } = await supabase.rpc("adjust_stock", {
    _product_id: args.productId, _variation_id: args.variationId as any, _type: args.type, _quantity: args.quantity, _reason: args.reason, _notes: args.notes ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as { previous: number; new: number; low: boolean };
}

const schema = z.object({
  productId: z.string().uuid({ message: "Choose a product" }),
  variationId: z.string().nullable(),
  quantity: z.number().int().min(0).max(1000000),
  reason: z.enum(STOCK_REASONS, { message: "Choose a reason" }),
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
});

type Prefill = { productId: string; variationId: string | null } | null;

export function AdjustStockModal({ open, prefill, onClose, onDone }: { open: boolean; prefill: Prefill; onClose: () => void; onDone: () => void }) {
  const { data: products = [] } = useQuery({
    queryKey: ["adjust-products"], enabled: open,
    queryFn: async () => (await supabase.from("products").select("id, name, sku, stock, reorder_level, product_variants(id, size, color, sku, stock)").is("deleted_at", null).order("name")).data ?? [],
  });
  const [productId, setProductId] = useState("");
  const [variationId, setVariationId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [type, setType] = useState<AdjustType>("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProductId(prefill?.productId ?? ""); setVariationId(prefill?.variationId ?? ""); setSearch(""); setType("add"); setQty(""); setReason(""); setNotes(""); setErrors({});
  }, [open, prefill?.productId, prefill?.variationId]);

  const product = products.find((p) => p.id === productId);
  const variants = (product?.product_variants ?? []) as { id: string; size: string; color: string | null; sku: string | null; stock: number }[];
  const variant = variants.find((v) => v.id === variationId);
  useEffect(() => { if (product && variants.length && !variant) setVariationId(variants[0].id); if (product && !variants.length) setVariationId(""); }, [productId, products.length]); // eslint-disable-line
  const current = variant ? variant.stock ?? 0 : product?.stock ?? 0;
  const reorder = product?.reorder_level ?? 5;
  const n = Number(qty) || 0;
  const next = computeNewStock(current, type, n);

  const matches = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || (p.sku ?? "").toLowerCase().includes(s) || (p.product_variants ?? []).some((v: any) => (v.sku ?? "").toLowerCase().includes(s))).slice(0, 30);
  }, [products, search]);

  async function submit() {
    const e: Record<string, string> = {};
    const parsed = schema.safeParse({ productId, variationId: variationId || null, quantity: n, reason, notes });
    if (!parsed.success) parsed.error.issues.forEach((i) => { e[String(i.path[0])] ??= i.message; });
    if (qty === "") e.quantity = "Quantity is required";
    else if (type !== "set" && n === 0) e.quantity = "Quantity must be more than 0";
    if (next < 0) e.quantity = `Stock can't go below 0 — current stock is ${current}`;
    if (variants.length && !variationId) e.variationId = "Choose a variation";
    setErrors(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await adjustStock({ productId, variationId: variationId || null, type, quantity: n, reason, notes: notes.trim() || null });
      toast.success(`Stock updated: ${r.previous} → ${r.new}`);
      if (r.low) toast.warning(r.new === 0 ? "Now out of stock — alert created" : "Below reorder level — low-stock alert created");
      onDone();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  const err = (k: string) => errors[k] ? <p className="text-xs text-status-red mt-1">{errors[k]}</p> : null;
  const lbl = "block text-sm font-medium mb-1.5";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="admin-ui max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Adjust Stock</DialogTitle><DialogDescription>Changes are saved with a history record.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <span className={lbl}>Product <span className="text-status-red">*</span></span>
            <div className="relative"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <input className={`${inputCls} w-full pl-9`} placeholder="Search name or SKU" maxLength={80}
                value={listOpen ? search : product ? `${product.name}${product.sku ? ` (${product.sku})` : ""}` : search}
                onFocus={() => { setListOpen(true); setSearch(""); }} onBlur={() => setTimeout(() => setListOpen(false), 150)} onChange={(e) => setSearch(e.target.value)} /></div>
            {listOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                {matches.length === 0 && <div className="p-3 text-sm text-muted-foreground">No products found</div>}
                {matches.map((p) => <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setProductId(p.id); setVariationId(""); setListOpen(false); setErrors({}); }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku ?? "No SKU"} · {(p.product_variants ?? []).length ? `${p.product_variants.length} variations` : `Stock ${p.stock}`}</div></button>)}
              </div>
            )}
            {err("productId")}
          </div>
          {variants.length > 0 && (
            <label className="block"><span className={lbl}>Variation (Size / Color)</span>
              <select className={`${inputCls} w-full`} value={variationId} onChange={(e) => setVariationId(e.target.value)}>
                {variants.map((v) => <option key={v.id} value={v.id}>{[v.size, v.color].filter(Boolean).join(" / ")}{v.sku ? ` — ${v.sku}` : ""} (stock {v.stock})</option>)}
              </select>{err("variationId")}</label>
          )}
          <label className="block"><span className={lbl}>Current Stock</span><input readOnly className={`${inputCls} w-full bg-secondary/50 tabular-nums`} value={product ? current : "—"} /></label>
          <fieldset><legend className={lbl}>Adjustment Type</legend>
            <div className="grid grid-cols-3 gap-2">
              {([["add", "Add Stock"], ["reduce", "Reduce Stock"], ["set", "Set New Stock"]] as const).map(([v, l]) => (
                <label key={v} className={`flex items-center gap-2 h-10 px-3 rounded-lg border text-sm cursor-pointer ${type === v ? "border-admin-nav bg-admin-nav/5 font-medium" : "border-border bg-card"}`}>
                  <input type="radio" name="adj-type" value={v} checked={type === v} onChange={() => setType(v)} className="accent-[var(--admin-nav)]" />{l}</label>
              ))}
            </div>
          </fieldset>
          <label className="block"><span className={lbl}>Quantity <span className="text-status-red">*</span></span><input inputMode="numeric" className={`${inputCls} w-full`} value={qty} onChange={(e) => { setQty(e.target.value.replace(/\D/g, "").slice(0, 7)); setErrors((x) => ({ ...x, quantity: "" })); }} />{err("quantity")}</label>
          <label className="block"><span className={lbl}>Reason <span className="text-status-red">*</span></span>
            <select className={`${inputCls} w-full`} value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: "" })); }}><option value="">Choose a reason</option>{STOCK_REASONS.map((r) => <option key={r}>{r}</option>)}</select>{err("reason")}</label>
          <label className="block"><span className={lbl}>Notes</span><textarea rows={2} maxLength={500} className={`${inputCls} w-full h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />{err("notes")}</label>
          {product && (
            <div className={`rounded-lg p-3 text-sm ${next < 0 ? "bg-status-red/10 text-status-red" : next <= reorder ? "bg-status-orange/10 text-status-orange" : "bg-status-green/10 text-status-green"}`}>
              {next < 0 ? <>Stock can't go below 0</> : <>New stock will be <b className="text-base">{next}</b></>}
              {next >= 0 && next <= reorder && <div className="flex items-center gap-1 text-xs mt-1"><AlertTriangle className="h-3.5 w-3.5" /> At or below reorder level ({reorder}) — a low-stock alert will be created</div>}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={busy} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Update Stock</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
