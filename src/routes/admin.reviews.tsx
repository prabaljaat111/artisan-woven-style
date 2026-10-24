import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListReviews, adminReviewSetApproval, adminDeleteReview } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Check, X, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsPage,
  head: () => ({ meta: adminPageMeta("Reviews") }),
});

function ReviewsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  async function load() { setLoading(true); try { setRows(await adminListReviews()); } finally { setLoading(false); } }
  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  async function setApproved(id: string, v: boolean) {
    try { await adminReviewSetApproval({ data: { id, is_approved: v } }); toast.success("Updated"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(id: string) {
    if (!confirm("Delete review?")) return;
    try { await adminDeleteReview({ data: { id } }); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const filtered = rows.filter((r) => filter === "all" || (filter === "approved" ? r.is_approved : !r.is_approved));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Reviews</h1>
          <p className="text-xs text-muted-foreground">{rows.length} total · {rows.filter((r) => !r.is_approved).length} pending</p>
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`text-[11px] px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-4 flex gap-3">
              {r.product?.images?.[0] && <img src={r.product.images[0]} className="w-14 h-14 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{r.product?.name ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">by {r.author_name} · {format(new Date(r.created_at), "dd MMM yy")}</div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}
                  </div>
                </div>
                {r.title && <div className="text-sm font-medium mt-1">{r.title}</div>}
                {r.body && <div className="text-xs text-muted-foreground mt-0.5">{r.body}</div>}
                <div className="flex gap-2 mt-2">
                  {!r.is_approved ? (
                    <button onClick={() => setApproved(r.id, true)} className="text-[11px] px-3 py-1 bg-green-600 text-white rounded-full flex items-center gap-1"><Check className="h-3 w-3" /> Approve</button>
                  ) : (
                    <button onClick={() => setApproved(r.id, false)} className="text-[11px] px-3 py-1 bg-secondary rounded-full flex items-center gap-1"><X className="h-3 w-3" /> Unpublish</button>
                  )}
                  <button onClick={() => remove(r.id)} className="text-[11px] px-3 py-1 border border-border rounded-full flex items-center gap-1 text-red-500"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">No reviews.</div>}
        </div>
      )}
    </div>
  );
}