import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListProducts, adminUpsertProduct, adminDeleteProduct, adminListCategories, adminListVariants, adminSaveVariants, adminBulkProducts, adminBulkUpsertProducts } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Upload, Download, ImagePlus, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Products · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function ProductsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([adminListProducts(), adminListCategories()]);
      setRows(p); setCats(c);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  // Live-sync: any product / variant / category change refreshes the list
  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => { if (t) clearTimeout(t); t = setTimeout(load, 250); };
    const channel = supabase
      .channel(`admin-products-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, debounced)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try { await adminDeleteProduct({ data: { id } }); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const filtered = rows.filter((r) => {
    if (q && !(r.name.toLowerCase().includes(q.toLowerCase()) || r.slug.includes(q.toLowerCase()))) return false;
    if (catFilter && r.category_id !== catFilter) return false;
    if (statusFilter === "published" && !r.is_published) return false;
    if (statusFilter === "draft" && r.is_published) return false;
    const s = Number(r.stock ?? 0);
    if (stockFilter === "in" && s < 10) return false;
    if (stockFilter === "low" && (s === 0 || s >= 10)) return false;
    if (stockFilter === "out" && s > 0) return false;
    return true;
  });
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const allShownSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);

  async function runBulk(action: "publish" | "unpublish" | "delete" | "bestseller_on" | "bestseller_off" | "new_on" | "new_off") {
    if (selectedIds.length === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.length} product(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await adminBulkProducts({ data: { ids: selectedIds, action } });
      toast.success(`Updated ${selectedIds.length} product(s)`);
      setSelected({});
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Bulk action failed"); }
    finally { setBulkBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Products</h1>
          <p className="text-xs text-muted-foreground">{rows.length} items</p>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="text-sm border border-border rounded-md px-3 py-1.5 bg-background" />
          <button type="button" onClick={() => setImportOpen(true)} className="border border-border rounded-full px-4 py-1.5 text-sm flex items-center gap-1 hover:bg-secondary"><Upload className="h-4 w-4" /> Bulk Import</button>
          <button type="button" onClick={() => setEditing({})} className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="border border-border rounded-md px-2 py-1.5 bg-background">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border border-border rounded-md px-2 py-1.5 bg-background">
          <option value="all">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)} className="border border-border rounded-md px-2 py-1.5 bg-background">
          <option value="all">Any stock</option>
          <option value="in">In stock (10+)</option>
          <option value="low">Low (1–9)</option>
          <option value="out">Out of stock</option>
        </select>
        <span className="text-muted-foreground">{filtered.length} of {rows.length}</span>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            <span className="text-muted-foreground mr-1">{selectedIds.length} selected:</span>
            <button disabled={bulkBusy} onClick={() => runBulk("publish")} className="px-2 py-1 border border-border rounded-md hover:bg-secondary">Publish</button>
            <button disabled={bulkBusy} onClick={() => runBulk("unpublish")} className="px-2 py-1 border border-border rounded-md hover:bg-secondary">Unpublish</button>
            <button disabled={bulkBusy} onClick={() => runBulk("bestseller_on")} className="px-2 py-1 border border-border rounded-md hover:bg-secondary">★ Bestseller</button>
            <button disabled={bulkBusy} onClick={() => runBulk("new_on")} className="px-2 py-1 border border-border rounded-md hover:bg-secondary">New</button>
            <button disabled={bulkBusy} onClick={() => runBulk("delete")} className="px-2 py-1 border border-red-500/40 text-red-500 rounded-md hover:bg-red-500/10">Delete</button>
          </div>
        )}
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 w-8"><input type="checkbox" checked={allShownSelected} onChange={(e) => {
                  const next = { ...selected };
                  filtered.forEach((r) => { next[r.id] = e.target.checked; });
                  setSelected(next);
                }} /></th>
                <th className="text-left p-2">Product</th><th className="text-left p-2">Category</th><th className="text-right p-2">Price</th><th className="text-right p-2">Stock</th><th className="text-left p-2">Status</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-2"><input type="checkbox" checked={!!selected[p.id]} onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))} /></td>
                  <td className="p-2 flex items-center gap-2">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div>
                      <div className="font-medium">{p.name}{p.is_bestseller && <span className="ml-1 text-[9px] text-amber-500">★</span>}{p.is_new && <span className="ml-1 text-[9px] text-emerald-500">NEW</span>}</div>
                      <div className="text-[10px] text-muted-foreground">{p.slug}</div>
                    </div>
                  </td>
                  <td className="p-2 text-xs">{p.category?.name ?? "—"}</td>
                  <td className="p-2 text-right">₹{Number(p.price).toLocaleString("en-IN")}</td>
                  <td className={`p-2 text-right ${p.track_inventory === false ? "text-muted-foreground" : p.stock === 0 ? "text-red-500" : p.stock <= (p.low_stock_threshold ?? 5) ? "text-amber-500" : ""}`}>{p.track_inventory === false ? "∞" : p.stock}</td>
                  <td className="p-2 text-[10px] uppercase">{p.is_published ? "Live" : "Draft"}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setEditing(p)} className="text-xs p-1.5 hover:bg-secondary rounded"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => remove(p.id)} className="text-xs p-1.5 hover:bg-secondary rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">No products match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProductDrawer initial={editing} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {importOpen && <BulkImportDialog onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(); }} />}
    </div>
  );
}

function ProductDrawer({ initial, cats, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    id: initial.id ?? null,
    slug: initial.slug ?? "",
    name: initial.name ?? "",
    description: initial.description ?? "",
    category_id: initial.category_id ?? null,
    price: Number(initial.price ?? 0),
    original_price: Number(initial.original_price ?? 0),
    color: initial.color ?? "",
    is_new: !!initial.is_new,
    is_bestseller: !!initial.is_bestseller,
    is_published: initial.is_published ?? true,
    stock: initial.stock ?? 0,
    sizes: initial.sizes ?? ["XS", "S", "M", "L", "XL", "XXL"],
    images: initial.images ?? [],
    low_stock_threshold: initial.low_stock_threshold ?? 5,
    track_inventory: initial.track_inventory ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [newImg, setNewImg] = useState("");
  // Variant matrix (per-size stock). Only loaded when editing an existing product.
  const [variants, setVariants] = useState<Array<{ id?: string; size: string; color: string | null; sku: string | null; stock: number }>>([]);
  const [variantsDirty, setVariantsDirty] = useState(false);
  useEffect(() => {
    if (!form.id) { setVariants([]); return; }
    adminListVariants({ data: { productId: form.id } })
      .then((rows: any[]) => {
        if (rows.length > 0) {
          setVariants(rows.map((r) => ({ id: r.id, size: r.size, color: r.color, sku: r.sku, stock: Number(r.stock) })));
        } else {
          // seed from sizes list
          setVariants(form.sizes.map((s: string) => ({ size: s, color: form.color || null, sku: null, stock: 0 })));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);
  const totalVariantStock = variants.reduce((s, v) => s + (v.stock || 0), 0);

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.slug.trim()) return toast.error("Slug is required");
    if (!/^[a-z0-9-]+$/.test(form.slug)) return toast.error("Slug: lowercase letters, digits and dashes only");
    if (!form.images || form.images.length === 0) return toast.error("Add at least 1 product image");
    if (form.price <= 0) return toast.error("Price must be greater than 0");
    if (form.original_price < form.price) return toast.error("MRP must be ≥ price");
    setSaving(true);
    try {
      const result = await adminUpsertProduct({ data: { ...form, color: form.color || null } });
      // Save variants too if there are any.
      if (variants.length > 0 && (form.id || result?.id)) {
        await adminSaveVariants({
          data: {
            productId: (form.id ?? result?.id) as string,
            variants: variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              sku: v.sku,
              stock: Number(v.stock) || 0,
            })),
          },
        });
      }
      toast.success("Saved"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-card w-full max-w-xl h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl text-primary">{form.id ? "Edit" : "Add"} Product</div>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form className="space-y-3 text-sm" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <F label="Name"><input value={form.name} onChange={(e) => {
            const name = e.target.value;
            setForm((prev: any) => ({ ...prev, name, slug: prev.id || prev.slug ? prev.slug : slugify(name) }));
          }} className={inputCls} /></F>
          <F label="Slug (lowercase, dashes)"><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className={inputCls} /></F>
          <F label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} /></F>
          <F label="Category">
            <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className={inputCls}>
              <option value="">— None —</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <div className="grid grid-cols-3 gap-2">
            <F label="Price"><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputCls} /></F>
            <F label="MRP"><input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} className={inputCls} /></F>
            <F label="Stock"><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className={inputCls} /></F>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <F label="Low-stock alert at"><input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} /></F>
            <label className="flex items-end gap-2 pb-2 text-xs">
              <input type="checkbox" checked={form.track_inventory} onChange={(e) => setForm({ ...form, track_inventory: e.target.checked })} />
              Track inventory
              <span className="text-muted-foreground">(off = always purchasable)</span>
            </label>
          </div>
          <F label="Color"><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inputCls} /></F>
          <F label="Sizes (comma-separated)"><input value={form.sizes.join(",")} onChange={(e) => setForm({ ...form, sizes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className={inputCls} /></F>
          {form.id && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Inventory by size</div>
                <div className="text-[10px] text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalVariantStock}</span></div>
              </div>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/60">
                    <tr>
                      <th className="text-left px-2 py-1.5">Size</th>
                      <th className="text-left px-2 py-1.5">Color</th>
                      <th className="text-left px-2 py-1.5">SKU</th>
                      <th className="text-right px-2 py-1.5">Stock</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => {
                      const status = v.stock <= 0 ? "out" : v.stock <= 10 ? "low" : "ok";
                      return (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1"><input value={v.size} onChange={(e) => { const a = [...variants]; a[i] = { ...v, size: e.target.value }; setVariants(a); setVariantsDirty(true); }} className="w-14 border border-border rounded px-1.5 py-1 bg-background" /></td>
                          <td className="px-2 py-1"><input value={v.color ?? ""} placeholder="—" onChange={(e) => { const a = [...variants]; a[i] = { ...v, color: e.target.value || null }; setVariants(a); setVariantsDirty(true); }} className="w-24 border border-border rounded px-1.5 py-1 bg-background" /></td>
                          <td className="px-2 py-1"><input value={v.sku ?? ""} placeholder="—" onChange={(e) => { const a = [...variants]; a[i] = { ...v, sku: e.target.value || null }; setVariants(a); setVariantsDirty(true); }} className="w-24 border border-border rounded px-1.5 py-1 bg-background" /></td>
                          <td className="px-2 py-1 text-right">
                            <input type="number" min={0} value={v.stock} onChange={(e) => { const a = [...variants]; a[i] = { ...v, stock: Math.max(0, Number(e.target.value) || 0) }; setVariants(a); setVariantsDirty(true); }} className={cn("w-16 border rounded px-1.5 py-1 bg-background text-right", status === "out" && "border-red-500 text-red-600", status === "low" && "border-amber-500 text-amber-600", status === "ok" && "border-green-500 text-green-700")} />
                          </td>
                          <td className="px-2 py-1 text-right"><button type="button" onClick={() => { setVariants(variants.filter((_, j) => j !== i)); setVariantsDirty(true); }}><X className="h-3 w-3 text-red-500" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => { setVariants([...variants, { size: "M", color: form.color || null, sku: null, stock: 0 }]); setVariantsDirty(true); }} className="mt-2 text-[11px] text-gold underline">+ Add variant row</button>
              {variantsDirty && <p className="text-[10px] text-amber-600 mt-1">Unsaved variant changes — click Save Product to persist.</p>}
            </div>
          )}
          {!form.id && (
            <p className="text-[11px] text-muted-foreground bg-secondary/50 border border-border rounded p-2">
              💡 Save the product first, then re-open it to set per-size stock.
            </p>
          )}
          <F label="Images (URLs)">
            <div className="space-y-1.5">
              {form.images.map((u: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <img src={u} className="w-10 h-10 rounded object-cover" />
                  <input value={u} onChange={(e) => { const a = [...form.images]; a[i] = e.target.value; setForm({ ...form, images: a }); }} className={inputCls + " flex-1"} />
                  <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_: any, j: number) => j !== i) })}><X className="h-4 w-4 text-red-500" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newImg} onChange={(e) => setNewImg(e.target.value)} placeholder="https://…" className={inputCls + " flex-1"} />
                <button type="button" onClick={() => { const v = newImg.trim(); if (v) { setForm({ ...form, images: [...form.images, v] }); setNewImg(""); } }} className="text-xs bg-secondary rounded-full px-3">Add</button>
              </div>
              {form.images.length === 0 && <p className="text-[10px] text-amber-600">At least 1 image required.</p>}
            </div>
          </F>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} /> New</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.is_bestseller} onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })} /> Bestseller</label>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground rounded-full py-2.5 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save Product"}</button>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-border rounded-md px-3 py-2 bg-background text-sm";
function F({ label, children }: any) { return <label className="block"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>{children}</label>; }
// ============== BULK CSV IMPORT ==============
const CSV_TEMPLATE = `slug,name,description,category_slug,price,original_price,color,is_new,is_bestseller,is_published,stock,sizes,images,low_stock_threshold,track_inventory
red-saree-001,Red Banarasi Saree,Handwoven silk saree,sarees,2499,3499,Red,true,false,true,10,"S,M,L,XL,Free Size","https://example.com/img1.jpg,https://example.com/img2.jpg",5,true`;

function parseBool(v: any, def = false): boolean {
  if (v === undefined || v === null || v === "") return def;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}
function parseList(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
}

function BulkImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleFile(f: File) {
    setFile(f);
    setParseErrors([]);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const rows: any[] = [];
        const errs: string[] = [];
        (res.data as any[]).forEach((row, i) => {
          try {
            const mapped = {
              slug: String(row.slug || "").trim().toLowerCase(),
              name: String(row.name || "").trim(),
              description: String(row.description || ""),
              category_slug: row.category_slug ? String(row.category_slug).trim() : null,
              price: Number(row.price),
              original_price: Number(row.original_price || row.price),
              color: row.color ? String(row.color) : null,
              is_new: parseBool(row.is_new),
              is_bestseller: parseBool(row.is_bestseller),
              is_published: parseBool(row.is_published, true),
              stock: Math.max(0, parseInt(row.stock || "0", 10) || 0),
              sizes: parseList(row.sizes).length ? parseList(row.sizes) : ["Free Size"],
              images: parseList(row.images).map((u) => u.trim()).filter(Boolean),
              low_stock_threshold: parseInt(row.low_stock_threshold || "5", 10) || 5,
              track_inventory: parseBool(row.track_inventory, true),
            };
            if (!mapped.slug) throw new Error("missing slug");
            if (!/^[a-z0-9-]+$/.test(mapped.slug)) throw new Error("slug must be lowercase letters, digits, dashes");
            if (!mapped.name) throw new Error("missing name");
            if (!mapped.price || mapped.price <= 0) throw new Error("invalid price");
            if (mapped.images.length === 0) throw new Error("at least 1 image required");
            rows.push(mapped);
          } catch (e: any) {
            errs.push(`Row ${i + 2}: ${e.message}`);
          }
        });
        setPreview(rows);
        setParseErrors(errs);
      },
      error: (err) => {
        setParseErrors([`CSV parse failed: ${err.message}`]);
      },
    });
  }

  async function runImport() {
    if (preview.length === 0) return;
    setBusy(true);
    setProgress("");
    const BATCH = 50;
    let done = 0;
    const allErrors: string[] = [];
    try {
      for (let i = 0; i < preview.length; i += BATCH) {
        const batch = preview.slice(i, i + BATCH);
        const res = await adminBulkUpsertProducts({ data: { rows: batch } });
        done += res.processed ?? batch.length;
        if (res.errors?.length) allErrors.push(...res.errors);
        setProgress(`${done}/${preview.length} uploaded…`);
      }
      if (allErrors.length === 0) {
        toast.success(`Imported ${done} products`);
        onDone();
      } else {
        toast.warning(`Imported ${done}, ${allErrors.length} errors`);
        setParseErrors(allErrors);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display text-xl text-primary">Bulk Import Products</div>
            <p className="text-xs text-muted-foreground">Upload a CSV. Existing products (same slug) will be updated.</p>
          </div>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 text-sm">
          <button type="button" onClick={downloadTemplate} className="text-xs flex items-center gap-1 text-primary hover:underline">
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </button>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer text-sm">
              {file ? <span className="font-medium">{file.name}</span> : <span className="text-muted-foreground">Click to choose CSV file</span>}
            </label>
          </div>

          {preview.length > 0 && (
            <div className="bg-secondary/30 rounded p-3 text-xs">
              <div className="font-medium mb-1">{preview.length} valid rows ready</div>
              <div className="text-muted-foreground">First: {preview[0].name} (₹{preview[0].price})</div>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
              <div className="font-medium text-red-500">{parseErrors.length} issue(s):</div>
              {parseErrors.slice(0, 20).map((e, i) => <div key={i}>• {e}</div>)}
              {parseErrors.length > 20 && <div>…and {parseErrors.length - 20} more</div>}
            </div>
          )}

          {progress && <div className="text-xs text-muted-foreground">{progress}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={busy} className="text-xs px-4 py-2 border border-border rounded-full hover:bg-secondary">Cancel</button>
            <button
              type="button"
              onClick={runImport}
              disabled={busy || preview.length === 0}
              className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50"
            >
              {busy ? "Importing…" : `Import ${preview.length} products`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
