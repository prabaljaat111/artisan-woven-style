import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListCategories, adminUpsertCategory, adminDeleteCategory } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
  head: () => ({ meta: [{ title: "Categories · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function CategoriesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() { setLoading(true); try { setRows(await adminListCategories()); } finally { setLoading(false); } }
  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  async function remove(id: string) {
    if (!confirm("Delete category?")) return;
    try { await adminDeleteCategory({ data: { id } }); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Categories</h1>
          <p className="text-xs text-muted-foreground">{rows.length} total</p>
        </div>
        <button onClick={() => setEditing({})} className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Slug</th><th className="text-left p-2">Description</th><th className="text-right p-2">Order</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-2 font-medium">{c.name}</td>
                  <td className="p-2 text-xs">{c.slug}</td>
                  <td className="p-2 text-xs text-muted-foreground truncate max-w-xs">{c.description}</td>
                  <td className="p-2 text-right">{c.sort_order}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="p-1.5 hover:bg-secondary rounded"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-secondary rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">No categories.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && <CategoryModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CategoryModal({ initial, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    id: initial.id ?? null,
    name: initial.name ?? "",
    slug: initial.slug ?? "",
    description: initial.description ?? "",
    sort_order: initial.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await adminUpsertCategory({ data: form }); toast.success("Saved"); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center"><div className="font-display text-xl text-primary">{form.id ? "Edit" : "Add"} Category</div><button onClick={onClose}><X className="h-4 w-4" /></button></div>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
        <input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
        <input type="number" placeholder="Sort order" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
        <button disabled={saving} onClick={save} className="w-full bg-primary text-primary-foreground rounded-full py-2.5 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}