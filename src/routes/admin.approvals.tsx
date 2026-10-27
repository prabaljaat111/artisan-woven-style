import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, Chip, PageHeader, inr, statusTone, btnGhost, btnPrimary } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/approvals")({
  component: ApprovalsPage,
  head: () => ({ meta: adminPageMeta("Product Approvals") }),
});

const TABS = ["pending_review", "draft", "rejected"] as const;
const LABEL: Record<string, string> = { pending_review: "Pending Review", draft: "Draft", rejected: "Rejected", active: "Active" };

function ApprovalsPage() {
  const { role } = useAuth();
  const canApprove = role === "admin" || role === "manager";
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending_review");
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["approvals", tab],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, sku, price, images, status, rejection_reason, updated_at, categories(name)").eq("status", tab).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase.from("products").update(approve
        ? { status: "active", is_published: true, rejection_reason: null }
        : { status: "rejected", is_published: false, rejection_reason: reason ?? "Needs changes" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.approve ? "Approved and published" : "Rejected"); qc.invalidateQueries({ queryKey: ["approvals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Product Approvals" subtitle={canApprove ? "Review products submitted by staff before they go live." : "Products you submit appear here until a manager approves them."} />
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-9 px-4 rounded-full text-sm ${tab === t ? "bg-admin-nav text-admin-nav-foreground" : "bg-card border border-border"}`}>{LABEL[t]}</button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40">
            <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nothing here.</td></tr>}
            {data.map((p: any) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-10 rounded-md bg-secondary overflow-hidden shrink-0">{p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
                    <div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku ?? "No SKU"}</div>
                      {p.rejection_reason && tab === "rejected" && <div className="text-xs text-status-red mt-0.5">{p.rejection_reason}</div>}</div>
                  </div>
                </td>
                <td className="p-3">{p.categories?.name ?? "—"}</td>
                <td className="p-3">{inr(p.price)}</td>
                <td className="p-3"><Chip tone={statusTone(p.status)}>{LABEL[p.status] ?? p.status}</Chip></td>
                <td className="p-3 text-right whitespace-nowrap">
                  {canApprove ? (
                    <div className="inline-flex gap-2">
                      {p.status !== "rejected" && <button className={btnGhost} onClick={() => { const r = prompt("Reason for rejection?"); if (r !== null) decide.mutate({ id: p.id, approve: false, reason: r || undefined }); }}>Reject</button>}
                      <button className={btnPrimary} onClick={() => decide.mutate({ id: p.id, approve: true })}>Approve</button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Awaiting manager</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
