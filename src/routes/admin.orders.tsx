import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { adminListOrders, adminGetOrder, adminUpdateOrder } from "@/lib/admin.functions";
import { format } from "date-fns";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Orders · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;

function OrdersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  async function load() {
    setLoading(true);
    try { setRows(await adminListOrders()); } finally { setLoading(false); }
  }
  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  useEffect(() => {
    if (!activeId) { setDetail(null); return; }
    adminGetOrder({ data: { id: activeId } }).then(setDetail).catch(() => toast.error("Failed to load order"));
  }, [activeId]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  async function update(patch: any) {
    if (!activeId) return;
    try {
      await adminUpdateOrder({ data: { id: activeId, ...patch } });
      toast.success("Updated");
      load(); adminGetOrder({ data: { id: activeId } }).then(setDetail);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">Orders</h1>
          <p className="text-xs text-muted-foreground">{rows.length} total</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {["all", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`text-[11px] px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s}</button>
          ))}
          <button onClick={load} className="text-[11px] px-3 py-1.5 rounded-full bg-secondary flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => setActiveId(o.id)} className="cursor-pointer border-t border-border hover:bg-secondary/30">
                  <td className="px-3 py-2 font-mono text-xs">{o.order_number}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{format(new Date(o.created_at), "dd MMM HH:mm")}</td>
                  <td className="px-3 py-2">{o.customer_name}<div className="text-[10px] text-muted-foreground">{o.customer_email}</div></td>
                  <td className="px-3 py-2 text-right font-semibold">₹{Number(o.total).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-xs">{o.payment_method} · <span className="text-muted-foreground">{o.payment_status}</span></td>
                  <td className="px-3 py-2"><span className="text-[10px] uppercase px-2 py-0.5 bg-gold/20 text-primary rounded-full">{o.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">No orders.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setActiveId(null)}>
          <div className="bg-card w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-xl text-primary">{detail?.order?.order_number ?? "…"}</div>
                <div className="text-xs text-muted-foreground">{detail?.order && format(new Date(detail.order.created_at), "dd MMM yyyy · HH:mm")}</div>
              </div>
              <button onClick={() => setActiveId(null)}><X className="h-5 w-5" /></button>
            </div>
            {!detail ? <div className="text-sm text-muted-foreground">Loading…</div> : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Info label="Customer" value={`${detail.order.customer_name}\n${detail.order.customer_email}\n${detail.order.customer_phone}`} />
                  <Info label="Ship to" value={Object.values(detail.order.shipping_address || {}).filter(Boolean).join(", ")} />
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/60"><tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Total</th></tr></thead>
                    <tbody>
                      {detail.items.map((i: any) => (
                        <tr key={i.id} className="border-t border-border">
                          <td className="p-2">{i.product_name}<div className="text-[10px] text-muted-foreground">{[i.size, i.color].filter(Boolean).join(" · ")}</div></td>
                          <td className="p-2 text-right">{i.qty}</td>
                          <td className="p-2 text-right">₹{Number(i.price).toLocaleString("en-IN")}</td>
                          <td className="p-2 text-right font-medium">₹{(i.qty * Number(i.price)).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1 text-xs">
                  <Row label="Subtotal" value={`₹${Number(detail.order.subtotal).toLocaleString("en-IN")}`} />
                  <Row label="GST" value={`₹${Number(detail.order.gst).toLocaleString("en-IN")}`} />
                  <Row label="Shipping" value={`₹${Number(detail.order.shipping).toLocaleString("en-IN")}`} />
                  {Number(detail.order.discount) > 0 && <Row label={`Discount${detail.order.coupon_code ? ` (${detail.order.coupon_code})` : ""}`} value={`-₹${Number(detail.order.discount).toLocaleString("en-IN")}`} />}
                  <Row label="Total" value={`₹${Number(detail.order.total).toLocaleString("en-IN")}`} bold />
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Order Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button key={s} onClick={() => update({ status: s })} className={`text-[11px] px-2.5 py-1 rounded-full border ${detail.order.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Payment</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["unpaid", "paid", "failed", "refunded"] as const).map((s) => (
                      <button key={s} onClick={() => update({ payment_status: s })} className={`text-[11px] px-2.5 py-1 rounded-full border ${detail.order.payment_status === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Tracking #</div>
                    <input defaultValue={detail.order.tracking_number ?? ""} onBlur={(e) => update({ tracking_number: e.target.value || null })} className="w-full border border-border rounded px-2 py-1.5 bg-background text-xs" />
                  </label>
                  <label className="block">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Tracking URL</div>
                    <input defaultValue={detail.order.tracking_url ?? ""} onBlur={(e) => update({ tracking_url: e.target.value || null })} className="w-full border border-border rounded px-2 py-1.5 bg-background text-xs" />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="whitespace-pre-line">{value}</div></div>;
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-semibold text-sm pt-1 border-t border-border" : ""}`}><span>{label}</span><span>{value}</span></div>;
}