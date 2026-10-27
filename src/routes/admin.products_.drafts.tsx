import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { Search, Pencil, Trash2, Send, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { Card, PageHeader, Chip, inputCls, btnPrimary, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/products_/drafts")({
  component: DraftsPage,
  head: () => ({ meta: adminPageMeta("Drafts & Pending Products") }),
});

type Tab = "all" | "draft" | "pending_review";

function DraftsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["drafts-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, sku, images, status, updated_at, categories(name)").in("status", ["draft", "pending_review"]).is("deleted_at", null).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => { setSel(new Set()); qc.invalidateQueries({ queryKey: ["drafts-pending"] }); qc.invalidateQueries({ queryKey: ["admin-products"] }); };

  const counts = { all: data.length, draft: data.filter((p) => p.status === "draft").length, pending_review: data.filter((p) => p.status === "pending_review").length };
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((p) => (tab === "all" || p.status === tab) && (!s || p.name.toLowerCase().includes(s) || (p.sku ?? "").toLowerCase().includes(s)));
  }, [data, tab, q]);
  const selectedRows = data.filter((p) => sel.has(p.id));
  const selectedDrafts = selectedRows.filter((p) => p.status === "draft");
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id));

  async function remove(ids: string[]) {
    setBusy(true);
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString(), is_published: false, status: "inactive" }).in("id", ids);
    setBusy(false); setConfirmDel(null);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}`); refresh();
  }
  async function submitForReview() {
    if (!selectedDrafts.length) return toast.error("Select at least one draft");
    setBusy(true);
    const { error } = await supabase.from("products").update({ status: "pending_review", is_published: false }).in("id", selectedDrafts.map((p) => p.id));
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Submitted ${selectedDrafts.length} for review`); refresh();
  }

  const tabs: [Tab, string][] = [["all", "All"], ["draft", "Drafts"], ["pending_review", "Pending Review"]];

  return (
    <div>
      <PageHeader title="Drafts & Pending Products" subtitle="Unfinished products and those waiting for approval." actions={<Link to="/admin/products/new" className={btnPrimary}>+ Add New Product</Link>} />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border mb-4">
        <div className="flex gap-1">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setSel(new Set()); }} className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === k ? "border-admin-nav font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {l} <span className="ml-1 text-xs rounded-full bg-secondary px-1.5 py-0.5 tabular-nums">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative mb-2 w-full sm:w-72"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><input className={`${inputCls} w-full pl-9`} placeholder="Search drafts by name or SKU" maxLength={80} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {sel.size > 0 && (
        <Card className="p-3 mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium mr-2">{sel.size} selected</span>
          <button className={btnGhost} disabled={busy || !selectedDrafts.length} onClick={submitForReview}><Send className="h-4 w-4" /> Submit for Review{selectedDrafts.length && selectedDrafts.length !== sel.size ? ` (${selectedDrafts.length} drafts)` : ""}</button>
          <button className={`${btnGhost} text-status-red`} disabled={busy} onClick={() => setConfirmDel([...sel])}><Trash2 className="h-4 w-4" /> Delete</button>
          <button className="text-xs underline ml-auto" onClick={() => setSel(new Set())}>Clear selection</button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr>
            <th className="p-3 w-8"><input type="checkbox" aria-label="Select all" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
            <th className="p-3">Image</th><th className="p-3">Product Name</th><th className="p-3">Category</th><th className="p-3">Last Modified</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-10" /></td></tr>)}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{q ? "No matches." : "Nothing here — all caught up."}</td></tr>}
            {rows.map((p: any) => (
              <tr key={p.id} onClick={() => navigate({ to: "/admin/products/$id", params: { id: p.id } })} className="border-t border-border/60 hover:bg-secondary/30 cursor-pointer">
                <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.has(p.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} /></td>
                <td className="p-3"><div className="h-11 w-11 rounded-md bg-secondary overflow-hidden grid place-items-center">{p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}</div></td>
                <td className="p-3"><div className="font-medium">{p.name}</div>{p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}</td>
                <td className="p-3 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                <td className="p-3 whitespace-nowrap" title={format(new Date(p.updated_at), "d MMM yyyy, HH:mm")}>{formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}</td>
                <td className="p-3">{p.status === "draft" ? <Chip tone="blue">Draft</Chip> : <Chip tone="orange">Pending Review</Chip>}</td>
                <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Link to="/admin/products/$id" params={{ id: p.id }} aria-label={`Edit ${p.name}`} className="inline-flex p-2 rounded-md hover:bg-secondary"><Pencil className="h-4 w-4" /></Link>
                  <button aria-label={`Delete ${p.name}`} className="p-2 rounded-md hover:bg-secondary text-status-red" onClick={() => setConfirmDel([p.id])}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="admin-ui">
          <DialogHeader><DialogTitle className="font-display text-2xl">Delete {confirmDel?.length === 1 ? "this product" : `${confirmDel?.length} products`}?</DialogTitle><DialogDescription>They'll be removed from this list and won't appear on the store.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2"><button className={btnGhost} onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50" disabled={busy} onClick={() => confirmDel && remove(confirmDel)}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Delete</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
