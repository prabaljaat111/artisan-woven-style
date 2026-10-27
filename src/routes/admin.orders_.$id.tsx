import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, FileText, Tag, Truck, RefreshCw, MessageCircle, Loader2, CheckCircle2, Circle } from "lucide-react";
import { adminPageMeta } from "@/lib/page-meta";
import { orderDetail, orderSetStatus, orderUpdateShipping, orderSyncRazorpay, orderLogEvent } from "@/lib/orders-admin.functions";
import { adminCreateShipment } from "@/lib/shiprocket.functions";
import { NEXT_STATUS, STATUS_LABEL, STATUS_TONE, whatsappMessage, waNumber, type OrderStatus } from "@/lib/order-workflow";
import { printInvoice, printLabel } from "@/lib/order-print";
import { Card, Chip, inr, inputCls, btnGhost, btnPrimary } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/orders_/$id")({
  component: OrderDetailPage,
  head: () => ({ meta: adminPageMeta("Order Details") }),
});

const FLOW: OrderStatus[] = ["processing", "shipped", "delivered"];

function OrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-order", id], queryFn: () => orderDetail({ data: { id } }) });
  const [busy, setBusy] = useState<string | null>(null);
  const [ship, setShip] = useState({ tracking_number: "", tracking_url: "", courier_name: "" });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-order", id] }); qc.invalidateQueries({ queryKey: ["admin-orders"] }); };

  useEffect(() => {
    if (data) setShip({ tracking_number: data.order.tracking_number ?? "", tracking_url: data.order.tracking_url ?? "", courier_name: (data.order as any).courier_name ?? "" });
  }, [data]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  };

  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  const { order: o, items, events, shipments } = data as any;
  const status = o.status as OrderStatus;
  const next = NEXT_STATUS[status] ?? [];
  const wa = waNumber(o.customer_phone);

  const setStatus = (s: OrderStatus) => {
    const needsConfirm = s === "cancelled" || s === "returned";
    if (needsConfirm && !confirm(`Mark this order as ${STATUS_LABEL[s]}? Stock will be returned to inventory.`)) return;
    run("status", () => orderSetStatus({ data: { id, status: s } }), `Order marked ${STATUS_LABEL[s]}`);
  };

  const sendWhatsApp = async () => {
    if (!wa) { toast.error("Customer phone number is missing or invalid"); return; }
    const msg = whatsappMessage({ ...o, ...ship });
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    await orderLogEvent({ data: { id, kind: "whatsapp", message: `WhatsApp update opened (${STATUS_LABEL[status]})` } }).catch(() => {});
    refresh();
  };

  const stepIdx = FLOW.indexOf(status);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/orders" className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All orders</Link>
          <h1 className="font-display text-3xl text-admin-nav mt-1">Order {o.order_number}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy, HH:mm")} · <Chip tone={STATUS_TONE[status] ?? "gray"}>{STATUS_LABEL[status] ?? status}</Chip></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => { try { printInvoice(o, items); orderLogEvent({ data: { id, kind: "invoice", message: "Invoice printed" } }); } catch (e: any) { toast.error(e.message); } }}><FileText className="h-4 w-4" /> Invoice PDF</button>
          <button className={btnGhost} onClick={() => { const l = shipments.find((s: any) => s.label_url)?.label_url; if (l) window.open(l, "_blank", "noopener"); else try { printLabel({ ...o, ...ship }, items); } catch (e: any) { toast.error(e.message); } }}><Tag className="h-4 w-4" /> Shipping label</button>
          <button className={btnGhost} onClick={sendWhatsApp}><MessageCircle className="h-4 w-4" /> WhatsApp update</button>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          {FLOW.map((s, i) => {
            const done = stepIdx >= i || (status === "returned" || status === "refunded") && i < 3;
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                {done ? <CheckCircle2 className="h-5 w-5 text-status-green" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <span className={`text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>{STATUS_LABEL[s]}</span>
                {i < FLOW.length - 1 && <div className="w-10 h-px bg-border" />}
              </div>
            );
          })}
          {["cancelled", "returned", "refunded"].includes(status) && <span className="ml-4"><Chip tone="red">{STATUS_LABEL[status]}</Chip></span>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {next.length === 0 && <span className="text-sm text-muted-foreground">This order is closed — no further steps.</span>}
          {next.map((s) => (
            <button key={s} disabled={busy === "status"} onClick={() => setStatus(s)} className={["cancelled", "returned"].includes(s) ? `${btnGhost} text-status-red` : btnPrimary}>
              {busy === "status" && <Loader2 className="h-4 w-4 animate-spin" />} Mark {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Stock is reduced automatically when an order is confirmed, and restored if it is cancelled or returned.</p>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 font-display text-lg">Items</div>
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground text-left"><tr><th className="p-3">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Total</th></tr></thead>
              <tbody>
                {items.map((i: any) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-3"><div className="flex items-center gap-3">{i.image && <img src={i.image} alt="" className="h-12 w-10 rounded object-cover" />}<div><div className="font-medium">{i.product_name}</div><div className="text-xs text-muted-foreground">{[i.size, i.color].filter(Boolean).join(" · ")}</div></div></div></td>
                    <td className="p-3 text-right">{i.qty}</td><td className="p-3 text-right">{inr(i.price)}</td><td className="p-3 text-right font-medium">{inr(i.qty * Number(i.price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-border space-y-1 text-sm max-w-xs ml-auto">
              <Line l="Subtotal" v={inr(o.subtotal)} /><Line l="GST" v={inr(o.gst)} /><Line l="Shipping" v={inr(o.shipping)} />
              {Number(o.discount) > 0 && <Line l={`Discount ${o.coupon_code ?? ""}`} v={`-${inr(o.discount)}`} />}
              <div className="flex justify-between font-semibold pt-1 border-t border-border"><span>Total</span><span>{inr(o.total)}</span></div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="font-display text-lg flex items-center gap-2"><Truck className="h-5 w-5" /> Shipping & tracking</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-xs text-muted-foreground">Courier<input value={ship.courier_name} onChange={(e) => setShip({ ...ship, courier_name: e.target.value })} className={`${inputCls} w-full mt-1`} placeholder="Delhivery" /></label>
              <label className="text-xs text-muted-foreground">Tracking ID<input value={ship.tracking_number} onChange={(e) => setShip({ ...ship, tracking_number: e.target.value })} className={`${inputCls} w-full mt-1`} placeholder="AWB number" /></label>
              <label className="text-xs text-muted-foreground">Tracking link<input value={ship.tracking_url} onChange={(e) => setShip({ ...ship, tracking_url: e.target.value })} className={`${inputCls} w-full mt-1`} placeholder="https://" /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btnPrimary} disabled={busy === "ship"} onClick={() => run("ship", () => orderUpdateShipping({ data: { id, tracking_number: ship.tracking_number || null, tracking_url: ship.tracking_url || null, courier_name: ship.courier_name || null } }), "Tracking saved")}>Save tracking</button>
              <button className={btnGhost} disabled={busy === "courier" || status === "cancelled"} onClick={() => run("courier", async () => { const r: any = await adminCreateShipment({ data: { order_id: id } }); if (r?.ok === false) throw new Error(r.action_required ?? r.message ?? "Courier booking failed"); }, "Sent to courier")}>
                {busy === "courier" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Book courier (Shiprocket / Delhivery)
              </button>
            </div>
            {shipments.length > 0 && (
              <div className="text-sm space-y-1">{shipments.map((s: any) => (
                <div key={s.id} className="flex flex-wrap gap-3 items-center"><Chip tone="blue">{s.provider}</Chip><span className="font-mono text-xs">{s.awb_code ?? "No AWB yet"}</span><span className="text-muted-foreground">{s.courier_name ?? ""} · {s.status}</span>{s.label_url && <a href={s.label_url} target="_blank" rel="noreferrer" className="underline text-admin-nav">Label</a>}</div>
              ))}</div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 text-sm space-y-1">
            <div className="font-display text-lg mb-1">Customer</div>
            <div className="font-medium">{o.customer_name}</div><div>{o.customer_email}</div><div>{o.customer_phone ?? "—"}</div>
            <div className="font-display text-lg mt-4 mb-1">Shipping address</div>
            <div className="whitespace-pre-line text-muted-foreground">{Object.values(o.shipping_address || {}).filter(Boolean).join("\n")}</div>
          </Card>

          <Card className="p-5 text-sm space-y-2">
            <div className="font-display text-lg">Payment</div>
            <div className="flex justify-between"><span>Status</span><Chip tone={o.payment_status === "paid" ? "green" : o.payment_status === "failed" ? "red" : "orange"}>{o.payment_status}</Chip></div>
            <Line l="Method" v={o.payment_method ?? "—"} />
            <Line l="Reference" v={o.payment_reference ?? "—"} />
            <button className={`${btnGhost} w-full justify-center`} disabled={busy === "rzp"} onClick={() => run("rzp", async () => { const r = await orderSyncRazorpay({ data: { id } }); toast.success(r.changed ? `Payment updated to ${r.payment_status}` : `Razorpay confirms: ${r.payment_status}`); })}>
              {busy === "rzp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync with Razorpay
            </button>
          </Card>

          <Card className="p-5">
            <div className="font-display text-lg mb-3">Timeline</div>
            <ol className="space-y-3 border-l border-border pl-4">
              {[...events].reverse().map((e: any) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-admin-nav" />
                  <div className="text-sm">{e.message}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.created_at), "dd MMM yyyy, HH:mm")}</div>
                </li>
              ))}
              {events.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Line({ l, v }: { l: string; v: string }) { return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{l}</span><span className="text-right break-all">{v}</span></div>; }
