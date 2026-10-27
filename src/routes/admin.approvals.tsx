import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, Check, X, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, Chip, PageHeader, inr, inputCls, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/approvals")({
  component: ApprovalsPage,
  head: () => ({ meta: adminPageMeta("Product Approvals") }),
});

type Tab = "pending" | "approved" | "rejected";
type Item = { key: string; id: string; name: string; image: string | null; category: string; personId: string | null; date: string; reason?: string | null; actor?: string | null; product: any };

const DIFF_FIELDS: [string, string][] = [["name", "Name"], ["sku", "SKU"], ["category_id", "Category"], ["original_price", "Regular price"], ["price", "Selling price"], ["stock", "Stock"], ["short_description", "Short description"], ["description", "Description"], ["sizes", "Sizes"], ["colors", "Colors"], ["images", "Images"], ["specifications", "Specifications"], ["seo_title", "SEO title"], ["meta_description", "Meta description"]];
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function ApprovalsPage() {
  const { role } = useAuth();
  const canApprove = role === "admin" || role === "manager";
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["approvals-v2"], enabled: canApprove,
    queryFn: async () => {
      const cols = "id, name, sku, price, original_price, stock, images, sizes, colors, status, short_description, description, specifications, seo_title, meta_description, category_id, submitted_by, submitted_at, updated_at, rejection_reason, approved_snapshot, categories(name)";
      const [pend, rej, logs, cats] = await Promise.all([
        supabase.from("products").select(cols).eq("status", "pending_review").is("deleted_at", null).order("submitted_at", { ascending: false, nullsFirst: false }),
        supabase.from("products").select(cols).eq("status", "rejected").is("deleted_at", null).order("updated_at", { ascending: false }),
        supabase.from("product_approval_logs").select("id, product_id, action, reason, actor_name, submitted_by, created_at, products(" + cols + ")").eq("action", "approved").order("created_at", { ascending: false }).limit(200),
        supabase.from("categories").select("id, name"),
      ]);
      const rejLogs = (await supabase.from("product_approval_logs").select("product_id, actor_name, created_at, reason").eq("action", "rejected").order("created_at", { ascending: false }).limit(500)).data ?? [];
      const ids = [...new Set([...(pend.data ?? []), ...(rej.data ?? [])].map((p: any) => p.submitted_by).concat((logs.data ?? []).map((l: any) => l.submitted_by)).filter(Boolean))] as string[];
      const { data: names } = ids.length ? await supabase.rpc("team_member_names", { _ids: ids }) : { data: [] as any[] };
      return { pending: pend.data ?? [], rejected: rej.data ?? [], approved: logs.data ?? [], rejLogs, names: names ?? [], cats: cats.data ?? [] };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["approvals-v2"] }); qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["drafts-pending"] }); };
  const person = (id: string | null) => {
    const n = data?.names.find((x: any) => x.id === id);
    return n ? `${n.name}${n.role ? ` (${n.role[0].toUpperCase() + n.role.slice(1)})` : ""}` : "—";
  };

  const lists: Record<Tab, Item[]> = useMemo(() => {
    const toItem = (p: any, extra: Partial<Item> = {}): Item => ({ key: p.id, id: p.id, name: p.name, image: p.images?.[0] ?? null, category: p.categories?.name ?? "—", personId: p.submitted_by, date: p.submitted_at ?? p.updated_at, product: p, ...extra });
    return {
      pending: (data?.pending ?? []).map((p) => toItem(p)),
      approved: (data?.approved ?? []).filter((l: any) => l.products).map((l: any) => toItem(l.products, { key: l.id, personId: l.submitted_by, date: l.created_at, actor: l.actor_name })),
      rejected: (data?.rejected ?? []).map((p: any) => { const l = data?.rejLogs.find((x) => x.product_id === p.id); return toItem(p, { date: l?.created_at ?? p.updated_at, actor: l?.actor_name, reason: p.rejection_reason }); }),
    };
  }, [data]);
  const rows = lists[tab].filter((r) => { const s = q.trim().toLowerCase(); return !s || r.name.toLowerCase().includes(s) || (r.product.sku ?? "").toLowerCase().includes(s) || person(r.personId).toLowerCase().includes(s); });

  async function decide(id: string, approve: boolean, reason?: string) {
    setBusyId(id);
    const { error } = await supabase.rpc("decide_product", { _product_id: id, _approve: approve, _reason: reason as any });
    setBusyId(null);
    if (error) { toast.error(error.message); return false; }
    toast.success(approve ? "Approved and published" : "Rejected — the submitter has been notified");
    setPreview(null); refresh(); return true;
  }

  if (!canApprove) return <PageHeader title="Product Approvals" subtitle="Only admins and managers can review products." />;

  const tabs: [Tab, string][] = [["pending", "Pending Approval"], ["approved", "Approved"], ["rejected", "Rejected"]];
  return (
    <div>
      <PageHeader title="Product Approvals" subtitle="Review products submitted by your team before they go live." />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === k ? "border-admin-nav font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {l} <span className="ml-1 text-xs rounded-full bg-secondary px-1.5 py-0.5 tabular-nums">{lists[k].length}</span></button>
          ))}
        </div>
        <div className="relative mb-2 w-full sm:w-72"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><input className={`${inputCls} w-full pl-9`} placeholder="Search product, SKU or person" maxLength={80} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr>
            <th className="p-3">Image</th><th className="p-3">Product Name</th><th className="p-3">Category</th><th className="p-3">Submitted By</th><th className="p-3">{tab === "pending" ? "Submitted" : tab === "approved" ? "Approved" : "Rejected"}</th><th className="p-3 text-right">{tab === "pending" ? "Actions" : "Decision"}</th></tr></thead>
          <tbody>
            {isLoading && [0, 1, 2].map((i) => <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-10" /></td></tr>)}
            {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{tab === "pending" ? "No products waiting for approval." : "Nothing here yet."}</td></tr>}
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border/60 hover:bg-secondary/20 align-top">
                <td className="p-3"><div className="h-11 w-11 rounded-md bg-secondary overflow-hidden grid place-items-center">{r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}</div></td>
                <td className="p-3"><button className="font-medium text-left hover:underline" onClick={() => setPreview(r.product)}>{r.name}</button>
                  {tab === "pending" && r.product.approved_snapshot && <div className="mt-1"><Chip tone="blue">Edited</Chip></div>}
                  {r.reason && <div className="text-xs text-status-red mt-1 max-w-xs">Reason: {r.reason}</div>}</td>
                <td className="p-3 text-muted-foreground">{r.category}</td>
                <td className="p-3">{person(r.personId)}</td>
                <td className="p-3 whitespace-nowrap">{r.date ? format(new Date(r.date), "d MMM yyyy, HH:mm") : "—"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {tab === "pending" ? (
                    <div className="inline-flex gap-2">
                      <button disabled={busyId === r.id} onClick={() => decide(r.id, true)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-status-green text-card text-xs font-medium disabled:opacity-50">{busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approve</button>
                      <button disabled={busyId === r.id} onClick={() => setRejecting({ id: r.id, name: r.name })} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-status-red text-card text-xs font-medium disabled:opacity-50"><X className="h-3.5 w-3.5" />Reject</button>
                    </div>
                  ) : <div className="text-xs text-muted-foreground">by {r.actor ?? "—"}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <PreviewSheet product={preview} cats={data?.cats ?? []} submitter={preview ? person(preview.submitted_by) : ""} onClose={() => setPreview(null)}
        onApprove={preview?.status === "pending_review" ? () => decide(preview.id, true) : undefined}
        onReject={preview?.status === "pending_review" ? () => setRejecting({ id: preview.id, name: preview.name }) : undefined} />
      <RejectDialog item={rejecting} onClose={() => setRejecting(null)} onSubmit={async (reason) => { if (rejecting && (await decide(rejecting.id, false, reason))) setRejecting(null); }} />
    </div>
  );
}

function RejectDialog({ item, onClose, onSubmit }: { item: { id: string; name: string } | null; onClose: () => void; onSubmit: (r: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); setErr(""); } }}>
      <DialogContent className="admin-ui">
        <DialogHeader><DialogTitle className="font-display text-2xl">Reject “{item?.name}”</DialogTitle><DialogDescription>The reason will be shown to the person who submitted it.</DialogDescription></DialogHeader>
        <label className="block"><span className="block text-sm font-medium mb-1.5">Reason <span className="text-status-red">*</span></span>
          <textarea autoFocus rows={4} maxLength={1000} className={`${inputCls} w-full h-auto py-2`} placeholder="e.g. Please add a front-facing photo and correct the fabric" value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} />
          <div className="flex justify-between text-xs mt-1"><span className="text-status-red">{err}</span><span className="text-muted-foreground">{reason.length}/1000</span></div></label>
        <DialogFooter className="gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-status-red text-card text-sm font-medium disabled:opacity-50" disabled={busy}
            onClick={async () => { if (reason.trim().length < 5) return setErr("Please give a reason (at least 5 characters)"); setBusy(true); await onSubmit(reason.trim()); setBusy(false); setReason(""); }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Reject product</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fmtVal(k: string, v: unknown, cats: { id: string; name: string }[]) {
  if (v === null || v === undefined || v === "") return "—";
  if (k === "category_id") return cats.find((c) => c.id === v)?.name ?? "—";
  if (k === "price" || k === "original_price") return inr(Number(v));
  if (k === "images") return `${(v as string[]).length} image(s)`;
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([a, b]) => `${a}: ${b}`).join(" · ") || "—";
  return strip(v);
}

function PreviewSheet({ product: p, cats, submitter, onClose, onApprove, onReject }: { product: any; cats: { id: string; name: string }[]; submitter: string; onClose: () => void; onApprove?: () => void; onReject?: () => void }) {
  const snap = p?.approved_snapshot as Record<string, unknown> | null;
  const changes = p && snap ? DIFF_FIELDS.filter(([k]) => JSON.stringify(snap[k] ?? null) !== JSON.stringify(p[k] ?? null)) : [];
  return (
    <Sheet open={!!p} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto admin-ui">
        {p && <>
          <SheetHeader><SheetTitle className="font-display text-2xl">{p.name}</SheetTitle></SheetHeader>
          <div className="text-xs text-muted-foreground mt-1">Submitted by {submitter}{p.submitted_at ? ` · ${format(new Date(p.submitted_at), "d MMM yyyy, HH:mm")}` : ""} · Read-only preview</div>
          {p.images?.length > 0 && <div className="flex gap-2 overflow-x-auto mt-4">{p.images.map((u: string) => <img key={u} src={u} alt="" className="h-36 w-28 object-cover rounded-lg shrink-0" />)}</div>}

          {snap && (
            <div className="mt-5">
              <h3 className="font-display text-lg mb-2">Changes since last approval {changes.length ? `(${changes.length})` : ""}</h3>
              {changes.length === 0 ? <p className="text-sm text-muted-foreground">No changes to the main fields.</p> : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[140px_1fr_1fr] text-xs font-semibold bg-secondary/50"><div className="p-2">Field</div><div className="p-2">Live version</div><div className="p-2">Submitted</div></div>
                  {changes.map(([k, label]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr_1fr] text-sm border-t border-border">
                      <div className="p-2 font-medium">{label}</div>
                      <div className="p-2 bg-status-red/5 line-through decoration-status-red/40 break-words">{fmtVal(k, snap[k], cats).slice(0, 400)}</div>
                      <div className="p-2 bg-status-green/5 break-words">{fmtVal(k, p[k], cats).slice(0, 400)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm">
            {DIFF_FIELDS.filter(([k]) => !["images", "description"].includes(k)).map(([k, label]) => <div key={k} className="border-b border-border/60 pb-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words">{fmtVal(k, p[k], cats)}</dd></div>)}
          </dl>
          <div className="mt-4"><div className="text-xs text-muted-foreground mb-1">Description</div><p className="text-sm whitespace-pre-line">{strip(p.description) || "—"}</p></div>
          {p.rejection_reason && <div className="mt-4 rounded-lg bg-status-red/10 text-status-red p-3 text-sm">Rejected: {p.rejection_reason}</div>}

          <div className="flex flex-wrap gap-2 mt-6 sticky bottom-0 bg-background py-3 border-t border-border">
            {onApprove && <button onClick={onApprove} className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-status-green text-card text-sm font-medium"><Check className="h-4 w-4" />Approve & publish</button>}
            {onReject && <button onClick={onReject} className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-status-red text-card text-sm font-medium"><X className="h-4 w-4" />Reject</button>}
            <Link to="/admin/products/$id" params={{ id: p.id }} className={btnGhost}>Open editor</Link>
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}
