import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, useNavigate as useNav } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListProducts, adminUpsertProduct, adminDeleteProduct, adminListCategories, adminListVariants, adminSaveVariants, adminBulkProducts, adminBulkUpsertProducts, adminCloneProduct } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Upload, Download, ImagePlus, GripVertical, Loader2, Copy, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Chip, inr, btnGhost, inputCls as adminInput } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
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
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new === 1 || s.new === "1" ? 1 : undefined }) as { new?: 1 },
  component: ProductsPage,
  head: () => ({ meta: adminPageMeta("All Products") }),
});

const PAGE_SIZES = [10, 25, 50];
type SortKey = "name" | "sku" | "price" | "stock" | "created_at";

function productStatus(p: any): { tone: "green" | "orange" | "red" | "blue"; label: string } {
  if (p.status === "pending_review") return { tone: "orange", label: "Pending Review" };
  if (p.status === "rejected") return { tone: "red", label: "Rejected" };
  if (!p.is_published || p.status === "draft" || p.status === "inactive") return { tone: "blue", label: "Draft" };
  if (p.stock_state === "out") return { tone: "red", label: "Out of Stock" };
  if (p.stock_state === "low") return { tone: "orange", label: "Low Stock" };
  return { tone: "green", label: "Active" };
}

function ProductsPage() {
  const { isTeam, loading: authLoading } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const go = useNav();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "created_at", asc: false });
  const [selected, setSelected] = useState<Record<string, any>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<{ ids: string[]; label: string } | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (search.new) go({ to: "/admin/products/new", replace: true }); }, [search.new, go]);

  async function load() {
    setLoading(true);
    let query = supabase.from("products").select("*, category:categories(name)", { count: "exact" }).is("deleted_at", null);
    if (debouncedQ) {
      const term = debouncedQ.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
    }
    if (catFilter) query = query.eq("category_id", catFilter);
    if (statusFilter === "active") query = query.eq("is_published", true).eq("stock_state", "ok");
    else if (statusFilter === "low") query = query.eq("stock_state", "low");
    else if (statusFilter === "out") query = query.eq("stock_state", "out");
    else if (statusFilter === "draft") query = query.eq("is_published", false).neq("status", "pending_review");
    else if (statusFilter === "pending") query = query.eq("status", "pending_review");
    const fromIdx = (page - 1) * pageSize;
    const { data, count, error } = await query.order(sort.key, { ascending: sort.asc, nullsFirst: false }).range(fromIdx, fromIdx + pageSize - 1);
    if (error) toast.error(error.message);
    setRows(data ?? []); setTotal(count ?? 0); setLoading(false);
  }
  useEffect(() => { if (!authLoading && isTeam) load(); /* eslint-disable-next-line */ }, [authLoading, isTeam, debouncedQ, catFilter, statusFilter, page, pageSize, sort]);
  useEffect(() => { if (!authLoading && isTeam) supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => setCats(data ?? [])); }, [authLoading, isTeam]);

  const selectedIds = Object.keys(selected);
  const allShown = rows.length > 0 && rows.every((r) => selected[r.id]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(total, page * pageSize);

  function toggleSort(key: SortKey) { setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true })); setPage(1); }

  async function bulkUpdate(patch: Record<string, any>, msg: string) {
    setBulkBusy(true);
    const { error } = await supabase.from("products").update(patch as any).in("id", selectedIds);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${msg} ${selectedIds.length} product(s)`); setSelected({}); load();
  }

  async function confirmDelete() {
    if (!deleteIds) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString(), is_published: false, status: "inactive" }).in("id", deleteIds.ids);
    setBulkBusy(false); setDeleteIds(null);
    if (error) return toast.error(error.message);
    toast.success("Moved to trash"); setSelected((s) => { const n = { ...s }; deleteIds.ids.forEach((id) => delete n[id]); return n; }); load();
  }

  function exportSelected() {
    const list = Object.values(selected);
    const csv = Papa.unparse(list.map((p: any) => ({
      name: p.name, sku: p.sku ?? "", category: p.category?.name ?? "", price: p.price, regular_price: p.original_price,
      stock: p.stock, status: productStatus(p).label, slug: p.slug,
    })));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ihs-products-${list.length}.csv`; a.click();
  }

  async function duplicate(p: any) {
    const { data: full, error } = await supabase.from("products").select("*").eq("id", p.id).single();
    if (error || !full) return toast.error(error?.message ?? "Not found");
    const { id, created_at, updated_at, stock_state, deleted_at, ...rest } = full as any;
    void id; void created_at; void updated_at; void stock_state; void deleted_at;
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const copy = {
      ...rest,
      name: `${full.name} (Copy)`,
      slug: `${full.slug}-copy-${suffix.toLowerCase()}`,
      sku: `${full.sku || "IHS"}-C${suffix}`,
      status: "draft", is_published: false, rejection_reason: null,
    };
    const { data: created, error: insErr } = await supabase.from("products").insert(copy).select("*, category:categories(name)").single();
    if (insErr || !created) return toast.error(insErr?.message ?? "Copy failed");
    const { data: variants } = await supabase.from("product_variants").select("size, color, stock, price, sale_price, image_url, status").eq("product_id", p.id);
    if (variants?.length) await supabase.from("product_variants").insert(variants.map((v) => ({ ...v, product_id: created.id, sku: null })));
    toast.success("Duplicated as draft"); load(); go({ to: "/admin/products/$id", params: { id: created.id } });
  }

  const SortTh = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`p-3 font-medium ${className}`}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}{sort.key === k ? (sort.asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-admin-nav">All Products <span className="text-muted-foreground text-2xl">({total.toLocaleString("en-IN")})</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your catalogue, stock and visibility.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setImportOpen(true)} className={btnGhost}><Upload className="h-4 w-4" /> Import</button>
          <button type="button" onClick={() => go({ to: "/admin/products/new" })} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-status-green text-card text-sm font-medium hover:opacity-90"><Plus className="h-4 w-4" /> Add New Product</button>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU" className={`${adminInput} w-full pl-9`} />
        </div>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} className={adminInput}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={adminInput}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending Review</option>
        </select>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium mr-1">{selectedIds.length} selected</span>
          <button disabled={bulkBusy} onClick={() => bulkUpdate({ is_published: true, status: "active" }, "Published")} className={btnGhost}>Publish</button>
          <button disabled={bulkBusy} onClick={() => bulkUpdate({ is_published: false, status: "inactive" }, "Unpublished")} className={btnGhost}>Unpublish</button>
          <div className="relative">
            <button disabled={bulkBusy} onClick={() => setMoveOpen((o) => !o)} className={btnGhost}>Move to Category</button>
            {moveOpen && (
              <div className="absolute z-30 mt-1 w-56 bg-card border border-border rounded-xl shadow-[var(--shadow-admin-card)] p-1 max-h-72 overflow-auto">
                {cats.map((c) => <button key={c.id} onClick={() => { setMoveOpen(false); bulkUpdate({ category_id: c.id }, `Moved to ${c.name}:`); }} className="block w-full text-left px-3 py-2 rounded-md hover:bg-secondary">{c.name}</button>)}
              </div>
            )}
          </div>
          <button onClick={exportSelected} className={btnGhost}><Download className="h-4 w-4" /> Export</button>
          <button disabled={bulkBusy} onClick={() => setDeleteIds({ ids: selectedIds, label: `${selectedIds.length} products` })} className={`${btnGhost} text-status-red`}><Trash2 className="h-4 w-4" /> Delete</button>
          <button onClick={() => setSelected({})} className="ml-auto text-xs text-muted-foreground underline">Clear</button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40">
            <tr>
              <th className="p-3 w-10"><input type="checkbox" aria-label="Select all on page" checked={allShown} onChange={(e) => setSelected((s) => { const n = { ...s }; rows.forEach((r) => { if (e.target.checked) n[r.id] = r; else delete n[r.id]; }); return n; })} /></th>
              <th className="p-3 font-medium">Image</th>
              <SortTh k="name">Product Name</SortTh>
              <SortTh k="sku">SKU</SortTh>
              <th className="p-3 font-medium">Category</th>
              <SortTh k="price">Price</SortTh>
              <SortTh k="stock">Stock</SortTh>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => <tr key={i} className="border-t border-border/60"><td colSpan={9} className="p-3"><Skeleton className="h-10" /></td></tr>)}
            {!loading && rows.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">No products match these filters.</td></tr>}
            {!loading && rows.map((p) => {
              const st = productStatus(p);
              const onSale = Number(p.original_price) > Number(p.price);
              const stockCls = p.stock_state === "out" ? "text-status-red" : p.stock_state === "low" ? "text-status-orange" : "text-status-green";
              return (
                <tr key={p.id} className="border-t border-border/60 hover:bg-secondary/20">
                  <td className="p-3"><input type="checkbox" aria-label={`Select ${p.name}`} checked={!!selected[p.id]} onChange={(e) => setSelected((s) => { const n = { ...s }; if (e.target.checked) n[p.id] = p; else delete n[p.id]; return n; })} /></td>
                  <td className="p-3"><div className="h-14 w-11 rounded-md bg-secondary overflow-hidden">{p.images?.[0] && <img src={p.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />}</div></td>
                  <td className="p-3"><button type="button" onClick={() => go({ to: "/admin/products/$id", params: { id: p.id } })} className="font-medium text-left hover:underline">{p.name}</button></td>
                  <td className="p-3 text-muted-foreground">{p.sku ?? "—"}</td>
                  <td className="p-3">{p.category?.name ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-medium">{inr(p.price)}</span>
                    {onSale && <span className="ml-1.5 text-xs text-muted-foreground line-through">{inr(p.original_price)}</span>}
                  </td>
                  <td className={`p-3 font-semibold tabular-nums ${stockCls}`}>{p.stock}</td>
                  <td className="p-3"><Chip tone={st.tone}>{st.label}</Chip></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button type="button" title="Edit" aria-label="Edit" onClick={() => go({ to: "/admin/products/$id", params: { id: p.id } })} className="p-2 rounded-md hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button type="button" title="Duplicate" aria-label="Duplicate" onClick={() => duplicate(p)} className="p-2 rounded-md hover:bg-secondary"><Copy className="h-4 w-4" /></button>
                    <button type="button" title="Delete" aria-label="Delete" onClick={() => setDeleteIds({ ids: [p.id], label: p.name })} className="p-2 rounded-md hover:bg-secondary text-status-red"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-border/60 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            Showing {showingFrom} to {showingTo} of {total.toLocaleString("en-IN")} products
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 px-2 rounded-md border border-border bg-card">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 w-8 grid place-items-center rounded-md border border-border disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            {pageList(page, pages).map((n, i) => n === 0 ? <span key={`e${i}`} className="px-1 text-muted-foreground">…</span> : (
              <button key={n} onClick={() => setPage(n)} className={`h-8 min-w-8 px-2 rounded-md text-sm ${n === page ? "bg-admin-nav text-admin-nav-foreground" : "border border-border hover:bg-secondary"}`}>{n}</button>
            ))}
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="h-8 w-8 grid place-items-center rounded-md border border-border disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </Card>

      {editing && <ProductDrawer initial={editing} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {importOpen && <BulkImportDialog onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(); }} />}

      <AlertDialog open={!!deleteIds} onOpenChange={(o) => !o && setDeleteIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteIds?.label}?</AlertDialogTitle>
            <AlertDialogDescription>They will be hidden from the shop and removed from this list. Order history is kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulkBusy} onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:opacity-90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function pageList(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((n, i) => { if (i > 0 && n - sorted[i - 1] > 1) out.push(0); out.push(n); });
  return out;
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
    colors: Array.isArray(initial.colors) && initial.colors.length > 0
      ? initial.colors
      : (initial.color ? [initial.color] : []),
    specifications: initial.specifications && typeof initial.specifications === "object" ? initial.specifications : {},
    attributes: initial.attributes && typeof initial.attributes === "object" ? initial.attributes : {},
    care_instructions: Array.isArray(initial.care_instructions) ? initial.care_instructions : [],
    shipping_info: Array.isArray(initial.shipping_info) ? initial.shipping_info : [],
    return_policy: Array.isArray(initial.return_policy) ? initial.return_policy : [],
    authenticity: initial.authenticity ?? "",
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
  const [newColor, setNewColor] = useState("");
  // Variant matrix (per-size stock). Only loaded when editing an existing product.
  const [variants, setVariants] = useState<Array<{ id?: string; size: string; color: string | null; sku: string | null; stock: number }>>([]);
  const [variantsDirty, setVariantsDirty] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
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
      const colorsList: string[] = Array.isArray(form.colors)
        ? Array.from(new Set(form.colors.map((c: string) => c.trim()).filter(Boolean)))
        : [];
      const primaryColor = colorsList[0] ?? (form.color || null);
      const result = await adminUpsertProduct({
        data: {
          ...form,
          color: primaryColor,
          colors: colorsList,
          specifications: cleanRecord(form.specifications),
          attributes: cleanRecord(form.attributes),
          care_instructions: cleanList(form.care_instructions),
          shipping_info: cleanList(form.shipping_info),
          return_policy: cleanList(form.return_policy),
          authenticity: String(form.authenticity ?? "").trim() || null,
        },
      });
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
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="bg-card w-full max-w-xl h-full overflow-y-auto p-6">
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
          <F label="Colors">
            <div className="space-y-2">
              {form.colors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.colors.map((c: string, idx: number) => (
                    <span
                      key={`${c}-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs"
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ background: c }}
                        aria-hidden="true"
                      />
                      {c}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, colors: form.colors.filter((_: string, i: number) => i !== idx) })}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${c}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = newColor.trim();
                      if (v && !form.colors.includes(v)) {
                        setForm({ ...form, colors: [...form.colors, v] });
                      }
                      setNewColor("");
                    }
                  }}
                  placeholder="Add a color (e.g. Stone Beige)"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newColor.trim();
                    if (v && !form.colors.includes(v)) {
                      setForm({ ...form, colors: [...form.colors, v] });
                    }
                    setNewColor("");
                  }}
                  className="px-3 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-xs whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">First color is the primary. Press Enter or click Add.</p>
            </div>
          </F>
          <SpecEditor
            label="Specifications"
            value={form.specifications}
            onChange={(specifications) => setForm({ ...form, specifications })}
            placeholderKey="Fabric"
            placeholderValue="Soft Tissue Chanderi"
          />
          <SpecEditor
            label="Attributes"
            value={form.attributes}
            onChange={(attributes) => setForm({ ...form, attributes })}
            placeholderKey="Blouse Piece"
            placeholderValue="Included"
          />
          <ListEditor label="Care Instructions" value={form.care_instructions} onChange={(care_instructions) => setForm({ ...form, care_instructions })} placeholder="Dry clean only" />
          <ListEditor label="Shipping Information" value={form.shipping_info} onChange={(shipping_info) => setForm({ ...form, shipping_info })} placeholder="Dispatched within 24–48 hours" />
          <ListEditor label="Return Policy" value={form.return_policy} onChange={(return_policy) => setForm({ ...form, return_policy })} placeholder="7-day easy returns on eligible items" />
          <F label="Authenticity"><textarea value={form.authenticity} onChange={(e) => setForm({ ...form, authenticity: e.target.value })} rows={2} className={inputCls} /></F>
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
          <F label="Images (first = main; drag to reorder)">
            <ImageManager images={form.images} onChange={(imgs) => setForm({ ...form, images: imgs })} newImg={newImg} setNewImg={setNewImg} />
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

function SpecEditor({ label, value, onChange, placeholderKey, placeholderValue }: { label: string; value: Record<string, string>; onChange: (next: Record<string, string>) => void; placeholderKey: string; placeholderValue: string }) {
  const entries = Object.entries(value ?? {});
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="space-y-2">
        {entries.map(([key, val], idx) => (
          <div key={`${key}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input value={key} onChange={(e) => { const next = { ...value }; delete next[key]; next[e.target.value] = val; onChange(next); }} placeholder={placeholderKey} className={inputCls} />
            <input value={val} onChange={(e) => onChange({ ...value, [key]: e.target.value })} placeholder={placeholderValue} className={inputCls} />
            <button type="button" onClick={() => { const next = { ...value }; delete next[key]; onChange(next); }} className="px-2 text-red-500"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...value, "": "" })} className="text-[11px] text-gold underline">+ Add {label.toLowerCase()} row</button>
      </div>
    </div>
  );
}

function ListEditor({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const items = Array.isArray(value) ? value : [];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input value={item} onChange={(e) => { const next = [...items]; next[idx] = e.target.value; onChange(next); }} placeholder={placeholder} className={inputCls} />
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="px-2 text-red-500"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ""])} className="text-[11px] text-gold underline">+ Add line</button>
      </div>
    </div>
  );
}

// ============== IMAGE MANAGER ==============
const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function ImageManager({
  images,
  onChange,
  newImg,
  setNewImg,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  newImg: string;
  setNewImg: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: list.length });
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!ALLOWED_IMG_TYPES.includes(f.type)) {
          toast.error(`${f.name}: only JPG, PNG, WEBP, AVIF allowed`);
          continue;
        }
        if (f.size > MAX_IMG_BYTES) {
          toast.error(`${f.name}: max 5MB`);
          continue;
        }
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, f, {
          cacheControl: "31536000",
          upsert: false,
          contentType: f.type,
        });
        if (error) {
          toast.error(`${f.name}: ${error.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
        setProgress({ done: i + 1, total: list.length });
      }
      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
        toast.success(`Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}`);
      }
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= images.length) return;
    const arr = [...images];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  }

  function removeAt(i: number) {
    onChange(images.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "border-2 border-dashed border-border rounded-lg p-4 text-center transition-colors",
          uploading && "opacity-60 pointer-events-none",
        )}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ALLOWED_IMG_TYPES.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-xs bg-primary text-primary-foreground rounded-full px-4 py-2"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {uploading && progress ? `Uploading ${progress.done}/${progress.total}…` : "Upload images"}
        </button>
        <div className="text-[10px] text-muted-foreground mt-2">or drag & drop · JPG/PNG/WEBP/AVIF · max 5MB each</div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((u, i) => (
            <div
              key={u + i}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null) move(dragIdx, i); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
              className={cn(
                "relative group border border-border rounded-md overflow-hidden bg-secondary",
                dragIdx === i && "opacity-40",
              )}
            >
              <img src={u} alt="" className="w-full aspect-square object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">MAIN</span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-3 w-3 text-white cursor-move" />
                <div className="flex gap-0.5">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="text-white text-[10px] px-1 disabled:opacity-30">←</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} className="text-white text-[10px] px-1 disabled:opacity-30">→</button>
                  <button type="button" onClick={() => removeAt(i)} className="text-red-300 hover:text-red-500"><X className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <input value={newImg} onChange={(e) => setNewImg(e.target.value)} placeholder="…or paste an image URL" className={inputCls + " flex-1 text-xs"} />
        <button
          type="button"
          onClick={() => {
            const v = newImg.trim();
            if (!v) return;
            if (!/^https?:\/\//i.test(v)) { toast.error("URL must start with http(s)://"); return; }
            onChange([...images, v]);
            setNewImg("");
          }}
          className="text-xs bg-secondary rounded-full px-3"
        >
          Add URL
        </button>
      </div>

      {images.length === 0 && <p className="text-[10px] text-amber-600">At least 1 image required.</p>}
    </div>
  );
}

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
function slugify(s: string): string {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}
function cleanList(v: any): string[] {
  return Array.isArray(v) ? v.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
}
function cleanRecord(v: any): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(
    Object.entries(v)
      .map(([key, val]) => [String(key).trim(), String(val ?? "").trim()])
      .filter(([key, val]) => key && val),
  );
}
function pick(row: any, keys: string[]): any {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}
function collectImages(row: any): string[] {
  // Accept: images | image | image_url | photo | picture | image_1..image_10
  const collected = parseList(
    pick(row, ["images", "image", "image_url", "image_urls", "photos", "photo", "picture", "pictures"]),
  );
  for (let i = 1; i <= 10; i++) {
    const v = row[`image_${i}`] ?? row[`image${i}`] ?? row[`img_${i}`] ?? row[`img${i}`];
    if (v && String(v).trim()) collected.push(String(v).trim());
  }
  return collected
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u));
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
            const name = String(pick(row, ["name", "title", "product_name", "product"]) ?? "").trim();
            const rawSlug = String(pick(row, ["slug", "handle", "url_key"]) ?? "").trim();
            const slug = (rawSlug ? slugify(rawSlug) : slugify(name));
            const priceRaw = pick(row, ["price", "selling_price", "sale_price", "final_price"]);
            const mrpRaw = pick(row, ["original_price", "mrp", "compare_at_price", "list_price"]);
            const price = Number(String(priceRaw ?? "").replace(/[^0-9.]/g, ""));
            const original = Number(String(mrpRaw ?? "").replace(/[^0-9.]/g, "")) || price;
            const images = collectImages(row);
            const sizesList = parseList(pick(row, ["sizes", "size", "variants"]));
            const mapped = {
              slug,
              name,
              description: String(pick(row, ["description", "desc", "details"]) ?? ""),
              category_slug: (() => {
                const c = pick(row, ["category_slug", "category", "category_name"]);
                return c ? slugify(String(c)) : null;
              })(),
              price,
              original_price: original,
              color: (() => { const c = pick(row, ["color", "colour"]); return c ? String(c) : null; })(),
              is_new: parseBool(pick(row, ["is_new", "new"])),
              is_bestseller: parseBool(pick(row, ["is_bestseller", "bestseller"])),
              is_published: parseBool(pick(row, ["is_published", "published", "active", "status"]), true),
              stock: Math.max(0, parseInt(String(pick(row, ["stock", "quantity", "qty", "inventory"]) ?? "0"), 10) || 0),
              sizes: sizesList.length ? sizesList : ["Free Size"],
              images,
              low_stock_threshold: parseInt(String(pick(row, ["low_stock_threshold", "low_stock"]) ?? "5"), 10) || 5,
              track_inventory: parseBool(pick(row, ["track_inventory", "track"]), true),
            };
            if (!mapped.name) throw new Error("missing name (column: name/title/product_name)");
            if (!mapped.slug) throw new Error("could not derive slug from name");
            if (!Number.isFinite(mapped.price) || mapped.price <= 0) throw new Error("invalid price (column: price/selling_price/mrp)");
            if (mapped.images.length === 0) throw new Error("at least 1 image URL required (column: images/image/image_url/image_1…) — must start with http(s)://");
            rows.push(mapped);
          } catch (e: any) {
            errs.push(`Row ${i + 2}: ${e.message}`);
          }
        });
        // De-duplicate by slug within the same file (last one wins)
        const seen = new Map<string, any>();
        for (const r of rows) {
          if (seen.has(r.slug)) errs.push(`Duplicate slug "${r.slug}" — keeping the last occurrence`);
          seen.set(r.slug, r);
        }
        setPreview(Array.from(seen.values()));
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

          <div className="text-[11px] text-muted-foreground bg-secondary/30 rounded p-2">
            <div className="font-medium mb-1">Accepted columns (any of these work):</div>
            <div>name / title · price / selling_price · original_price / mrp · category / category_slug · images / image / image_url / image_1…image_10</div>
            <div>slug is auto-generated from name if omitted. Image URLs must start with http(s)://</div>
          </div>

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
