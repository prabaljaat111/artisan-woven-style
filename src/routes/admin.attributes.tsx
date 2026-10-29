import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, inputCls, btnPrimary, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/attributes")({
  component: AttributesPage,
  head: () => ({ meta: adminPageMeta("Attributes") }),
});

type Val = { id: string; attribute_id: string; name: string; slug: string; sort_order: number; color_hex: string | null };
type Attr = { id: string; name: string; slug: string; attribute_values: Val[] };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const norm = (s: string) => s.toLowerCase().trim();
const nameSchema = z.string().trim().min(1, "Name is required").max(50, "Keep it under 50 characters");
const ORDER = ["size", "color", "fabric", "work-type"];

function AttributesPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["attributes-admin"],
    queryFn: async () => {
      const [{ data: attrs, error }, { data: prods }, { data: vars }] = await Promise.all([
        supabase.from("attributes").select("id, name, slug, attribute_values(id, attribute_id, name, slug, sort_order, color_hex)"),
        supabase.from("products").select("id, sizes, colors, product_attributes").is("deleted_at", null),
        supabase.from("product_variants").select("product_id, size, color"),
      ]);
      if (error) throw error;
      const list = ((attrs ?? []) as Attr[]).map((a) => ({ ...a, attribute_values: [...a.attribute_values].sort((x, y) => x.sort_order - y.sort_order) }));
      list.sort((a, b) => { const i = ORDER.indexOf(a.slug), j = ORDER.indexOf(b.slug); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || a.name.localeCompare(b.name); });
      // usage: products referencing value id in product_attributes, or (size/color) by name in arrays / variants
      const usage: Record<string, Set<string>> = {};
      const add = (vid: string, pid: string) => (usage[vid] ??= new Set()).add(pid);
      for (const a of list) for (const v of a.attribute_values) {
        for (const p of prods ?? []) {
          const pa = Array.isArray(p.product_attributes) ? (p.product_attributes as any[]) : [];
          if (pa.some((s) => Array.isArray(s?.value_ids) && s.value_ids.includes(v.id))) add(v.id, p.id);
          if (a.slug === "size" && (p.sizes ?? []).some((s: string) => norm(s) === norm(v.name))) add(v.id, p.id);
          if (a.slug === "color" && (p.colors ?? []).some((s: string) => norm(s) === norm(v.name))) add(v.id, p.id);
        }
        for (const x of vars ?? []) {
          if (a.slug === "size" && x.size && norm(x.size) === norm(v.name)) add(v.id, x.product_id);
          if (a.slug === "color" && x.color && norm(x.color) === norm(v.name)) add(v.id, x.product_id);
        }
      }
      const counts = Object.fromEntries(Object.entries(usage).map(([k, s]) => [k, s.size]));
      return { attrs: list, counts };
    },
  });
  const [tab, setTab] = useState("global");
  const refresh = () => qc.invalidateQueries({ queryKey: ["attributes-admin"] });
  const attrs = data?.attrs ?? [];
  const counts = data?.counts ?? {};
  const active = attrs.find((a) => a.id === tab);
  useEffect(() => { if (tab !== "global" && data && !active) setTab("global"); }, [data, active, tab]);

  return (
    <div>
      <PageHeader title="Attributes" subtitle="Sizes, colours, fabrics and more that you can assign to products." />
      <div className="flex gap-1 overflow-x-auto border-b border-border mb-5">
        {[{ id: "global", name: "Global Attributes" }, ...attrs].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? "border-admin-nav font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.name}</button>
        ))}
      </div>
      {isLoading ? <Card className="p-4 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</Card>
        : tab === "global" ? <GlobalTab attrs={attrs} counts={counts} canManage={canManage} onChange={refresh} onOpen={setTab} />
        : active ? <ValuesTab attr={active} counts={counts} canManage={canManage} onChange={refresh} /> : null}
    </div>
  );
}

function GlobalTab({ attrs, counts, canManage, onChange, onOpen }: { attrs: Attr[]; counts: Record<string, number>; canManage: boolean; onChange: () => void; onOpen: (id: string) => void }) {
  const [edit, setEdit] = useState<{ id?: string; name: string } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const r = nameSchema.safeParse(edit?.name ?? ""); if (!r.success) return setErr(r.error.issues[0].message);
    const slug = slugify(r.data);
    if (attrs.some((a) => a.slug === slug && a.id !== edit?.id)) return setErr("An attribute with this name already exists");
    setBusy(true);
    const { error } = edit?.id ? await supabase.from("attributes").update({ name: r.data }).eq("id", edit.id) : await supabase.from("attributes").insert({ name: r.data, slug });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(edit?.id ? "Attribute renamed" : "Attribute created — it now has its own tab"); setEdit(null); onChange();
  }
  async function remove(a: Attr) {
    const used = a.attribute_values.reduce((n, v) => n + (counts[v.id] ?? 0), 0);
    if (used > 0) return toast.error(`“${a.name}” is used by products — remove it from those products first`);
    if (!confirm(`Delete attribute “${a.name}” and its ${a.attribute_values.length} values?`)) return;
    const { error } = await supabase.from("attributes").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Attribute deleted"); onChange();
  }

  return (
    <>
      <div className="flex justify-end mb-3">{canManage && <button className={btnPrimary} onClick={() => { setErr(""); setEdit({ name: "" }); }}><Plus className="h-4 w-4" /> Add New Attribute</button>}</div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3">Attribute</th><th className="p-3">Slug</th><th className="p-3">Values</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {attrs.map((a) => (
              <tr key={a.id} className="border-t border-border/60 hover:bg-secondary/20">
                <td className="p-3"><button className="font-medium hover:underline" onClick={() => onOpen(a.id)}>{a.name}</button></td>
                <td className="p-3 text-muted-foreground">{a.slug}</td>
                <td className="p-3 text-muted-foreground">{a.attribute_values.length ? a.attribute_values.slice(0, 6).map((v) => v.name).join(", ") + (a.attribute_values.length > 6 ? "…" : "") : "—"}</td>
                <td className="p-3 text-right whitespace-nowrap">{canManage && <>
                  <button aria-label={`Rename ${a.name}`} className="p-2 rounded-md hover:bg-secondary" onClick={() => { setErr(""); setEdit({ id: a.id, name: a.name }); }}><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${a.name}`} className="p-2 rounded-md hover:bg-secondary text-status-red" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="admin-ui">
          <DialogHeader><DialogTitle className="font-display text-2xl">{edit?.id ? "Rename Attribute" : "New Attribute"}</DialogTitle></DialogHeader>
          <label className="block"><span className="block text-sm font-medium mb-1.5">Name</span>
            <input autoFocus className={`${inputCls} w-full`} placeholder="e.g. Sleeve Type" value={edit?.name ?? ""} maxLength={50} onChange={(e) => { setErr(""); setEdit((p) => p && { ...p, name: e.target.value }); }} onKeyDown={(e) => e.key === "Enter" && save()} />
            {err && <p className="text-xs text-status-red mt-1">{err}</p>}</label>
          <DialogFooter className="gap-2"><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button className={btnPrimary} disabled={busy} onClick={save}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ValuesTab({ attr, counts, canManage, onChange }: { attr: Attr; counts: Record<string, number>; canManage: boolean; onChange: () => void }) {
  const isColor = attr.slug === "color";
  const [rows, setRows] = useState<Val[]>(attr.attribute_values);
  useEffect(() => setRows(attr.attribute_values), [attr]);
  const [drag, setDrag] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<Val> | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function reorder(next: Val[]) {
    setRows(next);
    const res = await Promise.all(next.map((v, i) => v.sort_order === i + 1 ? null : supabase.from("attribute_values").update({ sort_order: i + 1 }).eq("id", v.id)));
    if (res.some((r) => r?.error)) toast.error("Couldn't save the new order"); else toast.success("Order saved");
    onChange();
  }
  async function save() {
    if (!edit) return;
    const e: Record<string, string> = {};
    const n = nameSchema.safeParse(edit.name ?? ""); if (!n.success) e.name = n.error.issues[0].message;
    const slug = edit.slug || slugify(edit.name ?? "");
    if (!/^[a-z0-9-]+$/.test(slug)) e.slug = "Lowercase letters, numbers and dashes only";
    if (rows.some((r) => r.id !== edit.id && (r.slug === slug || norm(r.name) === norm(edit.name ?? "")))) e.name = "This value already exists";
    const so = Number(edit.sort_order); if (!Number.isInteger(so) || so < 0) e.sort_order = "Must be 0 or more";
    if (isColor && edit.color_hex && !/^#[0-9a-fA-F]{6}$/.test(edit.color_hex)) e.color_hex = "Use a hex colour like #800000";
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    const payload = { name: n.data!, slug, sort_order: so, color_hex: isColor ? edit.color_hex || null : null };
    const { error } = edit.id ? await supabase.from("attribute_values").update(payload).eq("id", edit.id) : await supabase.from("attribute_values").insert({ ...payload, attribute_id: attr.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(edit.id ? "Saved" : `${attr.name} added`); setEdit(null); onChange();
  }
  async function remove(v: Val) {
    const used = counts[v.id] ?? 0;
    if (used > 0) return toast.error(`“${v.name}” is used by ${used} product${used === 1 ? "" : "s"} and can't be deleted`);
    if (!confirm(`Delete “${v.name}”?`)) return;
    const { error } = await supabase.from("attribute_values").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); onChange();
  }
  const open = (v: Partial<Val>) => { setErrs({}); setSlugTouched(!!v.id); setEdit(v); };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{canManage ? "Drag rows to reorder." : ""}</p>
        {canManage && <button className={btnPrimary} onClick={() => open({ name: "", slug: "", sort_order: rows.length + 1, color_hex: isColor ? "#800000" : null })}><Plus className="h-4 w-4" /> Add New {attr.name}</button>}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3 w-8" /><th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3">Products</th><th className="p-3">Sort Order</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No values yet.</td></tr>}
            {rows.map((v, i) => (
              <tr key={v.id} draggable={canManage} onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { const n = [...rows]; const [x] = n.splice(drag, 1); n.splice(i, 0, x); reorder(n); } setDrag(null); }}
                className={`border-t border-border/60 hover:bg-secondary/20 ${drag === i ? "opacity-40" : ""}`}>
                <td className="p-3 text-muted-foreground cursor-grab">{canManage && <GripVertical className="h-4 w-4" />}</td>
                <td className="p-3"><div className="flex items-center gap-2.5">
                  {isColor && <span className="h-5 w-5 rounded-full border border-border shrink-0" style={{ background: v.color_hex ?? "transparent" }} />}
                  <span className="font-medium">{v.name}</span>{isColor && v.color_hex && <span className="text-xs text-muted-foreground uppercase">{v.color_hex}</span>}</div></td>
                <td className="p-3 text-muted-foreground">{v.slug}</td>
                <td className="p-3 tabular-nums font-medium">{counts[v.id] ?? 0}</td>
                <td className="p-3 tabular-nums">{v.sort_order}</td>
                <td className="p-3 text-right whitespace-nowrap">{canManage && <>
                  <button aria-label={`Edit ${v.name}`} className="p-2 rounded-md hover:bg-secondary" onClick={() => open(v)}><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${v.name}`} title={(counts[v.id] ?? 0) > 0 ? "In use — can't delete" : "Delete"} className={`p-2 rounded-md hover:bg-secondary text-status-red ${(counts[v.id] ?? 0) > 0 ? "opacity-40" : ""}`} onClick={() => remove(v)}><Trash2 className="h-4 w-4" /></button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="admin-ui">
          <DialogHeader><DialogTitle className="font-display text-2xl">{edit?.id ? `Edit ${attr.name}` : `Add New ${attr.name}`}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <F label="Name" err={errs.name}><input autoFocus className={`${inputCls} w-full`} maxLength={50} value={edit?.name ?? ""} onChange={(e) => { const name = e.target.value; setEdit((p) => p && { ...p, name, ...(slugTouched ? {} : { slug: slugify(name) }) }); }} /></F>
            <F label="Slug" err={errs.slug}><input className={`${inputCls} w-full`} value={edit?.slug ?? ""} onChange={(e) => { setSlugTouched(true); setEdit((p) => p && { ...p, slug: e.target.value.toLowerCase() }); }} /></F>
            {isColor && <F label="Colour" err={errs.color_hex}><div className="flex items-center gap-3">
              <input type="color" className="h-10 w-14 rounded-lg border border-border bg-card cursor-pointer" value={edit?.color_hex || "#000000"} onChange={(e) => setEdit((p) => p && { ...p, color_hex: e.target.value })} />
              <input className={`${inputCls} w-32 uppercase`} value={edit?.color_hex ?? ""} maxLength={7} onChange={(e) => setEdit((p) => p && { ...p, color_hex: e.target.value })} /></div></F>}
            <F label="Sort order" err={errs.sort_order}><input type="number" min={0} className={`${inputCls} w-full`} value={edit?.sort_order ?? 0} onChange={(e) => setEdit((p) => p && { ...p, sort_order: e.target.value as any })} /></F>
          </div>
          <DialogFooter className="gap-2"><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button><button className={btnPrimary} disabled={busy} onClick={save}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function F({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium mb-1.5">{label}</span>{children}{err && <p className="text-xs text-status-red mt-1">{err}</p>}</label>;
}
