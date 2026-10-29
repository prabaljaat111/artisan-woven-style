import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Upload, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, btnPrimary, btnGhost, inputCls } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
  head: () => ({ meta: adminPageMeta("Product Categories") }),
});

type Cat = { id: string; name: string; slug: string; description: string | null; image_url: string | null; parent_id: string | null; sort_order: number; seo_title: string | null; meta_description: string | null };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const schema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(60, "Keep it under 60 characters"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only").max(60),
  description: z.string().max(500, "Keep it under 500 characters"),
  seo_title: z.string().max(70, "Keep it under 70 characters"),
  meta_description: z.string().max(160, "Keep it under 160 characters"),
  sort_order: z.number().int().min(0, "Must be 0 or more"),
});

function CategoriesPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    enabled: canManage,
    queryFn: async () => {
      const [{ data: cats, error }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("id, name, slug, description, image_url, parent_id, sort_order, seo_title, meta_description").order("sort_order").order("name"),
        supabase.from("products").select("category_id").is("deleted_at", null),
      ]);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (prods ?? []).forEach((p) => { if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1; });
      return { cats: (cats ?? []) as Cat[], counts };
    },
  });
  const [order, setOrder] = useState<Cat[]>([]);
  useEffect(() => { if (data) setOrder(data.cats); }, [data]);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [deleting, setDeleting] = useState<Cat | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-categories"] });

  if (!canManage) return <PageHeader title="Product Categories" subtitle="Only admins and managers can manage categories." />;

  const counts = data?.counts ?? {};
  const byId = new Map(order.map((c) => [c.id, c]));

  async function saveOrder(next: Cat[]) {
    setOrder(next);
    const results = await Promise.all(next.map((c, i) => c.sort_order === i + 1 ? null : supabase.from("categories").update({ sort_order: i + 1 }).eq("id", c.id)));
    if (results.some((r) => r?.error)) toast.error("Couldn't save the new order"); else toast.success("Order saved");
    refresh();
  }

  return (
    <div>
      <PageHeader title="Product Categories" subtitle="Drag rows to change the order categories appear on your store."
        actions={<button className={btnPrimary} onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Add New Category</button>} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40">
            <tr><th className="p-3 w-8" /><th className="p-3">Image</th><th className="p-3">Category Name</th><th className="p-3">Slug</th><th className="p-3">Products</th><th className="p-3">Description</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading && [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-10" /></td></tr>)}
            {!isLoading && order.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No categories yet.</td></tr>}
            {order.map((c, i) => (
              <tr key={c.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { const n = [...order]; const [x] = n.splice(drag, 1); n.splice(i, 0, x); saveOrder(n); } setDrag(null); }}
                className={`border-t border-border/60 hover:bg-secondary/20 ${drag === i ? "opacity-40" : ""}`}>
                <td className="p-3 cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></td>
                <td className="p-3"><div className="h-11 w-11 rounded-lg bg-secondary overflow-hidden grid place-items-center">{c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}</div></td>
                <td className="p-3"><div className="font-medium">{c.name}</div>{c.parent_id && byId.get(c.parent_id) && <div className="text-xs text-muted-foreground">in {byId.get(c.parent_id)?.name}</div>}</td>
                <td className="p-3 text-muted-foreground">{c.slug}</td>
                <td className="p-3 tabular-nums font-medium">{counts[c.id] ?? 0}</td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{c.description || "—"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button aria-label={`Edit ${c.name}`} className="p-2 rounded-md hover:bg-secondary" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${c.name}`} className="p-2 rounded-md hover:bg-secondary text-status-red" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <CategoryDrawer key={editing?.id ?? (editing ? "new" : "none")} cat={editing} all={order} nextSort={order.length + 1} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      <DeleteDialog cat={deleting} count={deleting ? counts[deleting.id] ?? 0 : 0} all={order} hasChildren={!!deleting && order.some((c) => c.parent_id === deleting.id)} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); refresh(); }} />
    </div>
  );
}

function CategoryDrawer({ cat, all, nextSort, onClose, onSaved }: { cat: Partial<Cat> | null; all: Cat[]; nextSort: number; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: cat?.name ?? "", slug: cat?.slug ?? "", parent_id: cat?.parent_id ?? "", description: cat?.description ?? "",
    image_url: cat?.image_url ?? "", sort_order: cat?.sort_order ?? nextSort, seo_title: cat?.seo_title ?? "", meta_description: cat?.meta_description ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(!!cat?.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f, v: any) => { setF((p) => ({ ...p, [k]: v, ...(k === "name" && !slugTouched ? { slug: slugify(v) } : {}) })); setErrors((e) => ({ ...e, [k]: "" })); };
  const err = (k: string) => errors[k] ? <p className="text-xs text-status-red mt-1">{errors[k]}</p> : null;

  // exclude self and descendants from parent options
  const blocked = new Set<string>();
  if (cat?.id) { const walk = (id: string) => { blocked.add(id); all.filter((c) => c.parent_id === id).forEach((c) => walk(c.id)); }; walk(cat.id); }

  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return toast.error("Use JPG, PNG, WEBP or AVIF");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(true);
    const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);
    if (error) return toast.error(error.message);
    set("image_url", supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }

  async function save() {
    const parsed = schema.safeParse({ ...f, sort_order: Number(f.sort_order) });
    if (!parsed.success) {
      const e: Record<string, string> = {}; parsed.error.issues.forEach((i) => { e[String(i.path[0])] ??= i.message; }); setErrors(e); return;
    }
    setSaving(true);
    const payload = { name: f.name.trim(), slug: f.slug, parent_id: f.parent_id || null, description: f.description || null, image_url: f.image_url || null, sort_order: Number(f.sort_order), seo_title: f.seo_title || null, meta_description: f.meta_description || null };
    const { error } = cat?.id ? await supabase.from("categories").update(payload).eq("id", cat.id) : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) {
      if (error.message.includes("slug")) { setErrors({ slug: "This slug is already used" }); return; }
      return toast.error(error.message);
    }
    toast.success(cat?.id ? "Category updated" : "Category added"); onSaved();
  }

  return (
    <Sheet open={!!cat} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto admin-ui">
        <SheetHeader><SheetTitle className="font-display text-2xl">{cat?.id ? "Edit Category" : "Add New Category"}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-5">
          <L label="Name" required><input className={`${inputCls} w-full`} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />{err("name")}</L>
          <L label="Slug"><div className="flex gap-2"><input className={`${inputCls} w-full`} value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }} />{slugTouched && <button type="button" className="text-xs underline" onClick={() => { setSlugTouched(false); set("slug", slugify(f.name)); }}>Reset</button>}</div>{err("slug")}</L>
          <L label="Parent category">
            <select className={`${inputCls} w-full`} value={f.parent_id} onChange={(e) => set("parent_id", e.target.value)}>
              <option value="">None (top level)</option>{all.filter((c) => !blocked.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </L>
          <L label="Description"><textarea rows={3} className={`${inputCls} w-full h-auto py-2`} value={f.description} onChange={(e) => set("description", e.target.value)} />{err("description")}</L>
          <L label="Image">
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 rounded-lg bg-secondary overflow-hidden grid place-items-center shrink-0">{f.image_url ? <img src={f.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}</div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); e.target.value = ""; }} />
              <div className="space-y-1"><button type="button" className={btnGhost} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</button>
                {f.image_url && <button type="button" className="block text-xs text-status-red" onClick={() => set("image_url", "")}>Remove</button>}</div>
            </div>
          </L>
          <L label="Sort order"><input type="number" min={0} className={`${inputCls} w-full`} value={f.sort_order} onChange={(e) => set("sort_order", e.target.value)} />{err("sort_order")}</L>
          <div className="pt-2 border-t border-border space-y-4">
            <div className="text-sm font-semibold">SEO</div>
            <L label={`SEO title (${f.seo_title.length}/70)`}><input className={`${inputCls} w-full`} value={f.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder={f.name} />{err("seo_title")}</L>
            <L label={`Meta description (${f.meta_description.length}/160)`}><textarea rows={3} className={`${inputCls} w-full h-auto py-2`} value={f.meta_description} onChange={(e) => set("meta_description", e.target.value)} />{err("meta_description")}</L>
          </div>
          <div className="flex gap-2 pt-2">
            <button className={btnPrimary} disabled={saving} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{cat?.id ? "Save changes" : "Add category"}</button>
            <button className={btnGhost} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DeleteDialog({ cat, count, all, hasChildren, onClose, onDone }: { cat: Cat | null; count: number; all: Cat[]; hasChildren: boolean; onClose: () => void; onDone: () => void }) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setTarget(""), [cat?.id]);
  if (!cat) return null;

  async function moveProducts() {
    if (!target || !cat) return;
    setBusy(true);
    const { error } = await supabase.from("products").update({ category_id: target }).eq("category_id", cat.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Moved ${count} product(s)`); onDone();
  }
  async function remove() {
    if (!cat) return;
    setBusy(true);
    // re-check live before deleting
    const { count: live, error: countError } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", cat.id).is("deleted_at", null);
    if (countError) { setBusy(false); return toast.error(countError.message); }
    if ((live ?? 0) > 0) { setBusy(false); return toast.error("This category still has products — move them first"); }
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Category deleted"); onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="admin-ui">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Delete “{cat.name}”?</DialogTitle>
          <DialogDescription>
            {count > 0 ? `This category still has ${count} product${count === 1 ? "" : "s"}. Move them to another category before deleting.` : "This category is empty and can be deleted safely."}
            {hasChildren && " Sub-categories will move up one level."}
          </DialogDescription>
        </DialogHeader>
        {count > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Move products to</label>
            <select className={`${inputCls} w-full`} value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choose a category</option>{all.filter((c) => c.id !== cat.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <DialogFooter className="gap-2">
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          {count > 0
            ? <button className={btnPrimary} disabled={!target || busy} onClick={moveProducts}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Move {count} product{count === 1 ? "" : "s"}</button>
            : <button className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50" disabled={busy} onClick={remove}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Delete category</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function L({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium mb-1.5">{label}{required && <span className="text-status-red"> *</span>}</span>{children}</label>;
}
