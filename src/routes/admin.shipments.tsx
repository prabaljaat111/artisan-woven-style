import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { toast } from "sonner";
import { Truck, Package, FileText, FileBox, MapPin, RefreshCw, XCircle, ExternalLink, Plus } from "lucide-react";
import {
  adminListShipments,
  adminAssignAwb,
  adminGeneratePickup,
  adminGenerateLabel,
  adminGenerateManifest,
  adminGenerateInvoice,
  adminTrackShipment,
  adminCancelShipment,
  adminCreateShipment,
} from "@/lib/shiprocket.functions";

export const Route = createFileRoute("/admin/shipments")({
  component: ShipmentsPage,
  head: () => ({ meta: adminPageMeta("Shipments") }),
});

interface ShipmentRow {
  id: string;
  order_id: string;
  sr_order_id: string | null;
  sr_shipment_id: string | null;
  awb_code: string | null;
  courier_name: string | null;
  status: string;
  label_url: string | null;
  manifest_url: string | null;
  invoice_url: string | null;
  tracking_url: string | null;
  pickup_scheduled_date: string | null;
  error: string | null;
  created_at: string;
  order: {
    order_number: string;
    customer_name: string;
    customer_phone: string | null;
    total: number;
    payment_status: string;
    shipping_address: Record<string, string>;
  } | null;
}

function ShipmentsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryOrderId, setRetryOrderId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await adminListShipments();
      setRows(data as unknown as ShipmentRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  async function action(id: string, fn: () => Promise<unknown>, successMsg: string) {
    setBusyId(id);
    try {
      await fn();
      toast.success(successMsg);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function pushOrderToSr() {
    if (!retryOrderId.trim()) return;
    try {
      const res = await adminCreateShipment({ data: { order_id: retryOrderId.trim() } }) as {
        ok?: false;
        provider?: "shiprocket" | "delhivery";
        awb_code?: string | null;
        action_required?: string;
        message?: string;
      };
      if (res.ok === false) {
        toast.error(res.action_required ?? res.message ?? "Courier push failed");
        await load();
        return;
      }
      toast.success(res.provider === "delhivery" ? `Pushed to Delhivery${res.awb_code ? ` · AWB ${res.awb_code}` : ""}` : "Pushed to Shiprocket");
      setRetryOrderId("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary flex items-center gap-2"><Truck className="h-5 w-5" /> Shipments</h1>
          <p className="text-xs text-muted-foreground">All courier shipments. Created automatically on paid / COD orders.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={retryOrderId}
            onChange={(e) => setRetryOrderId(e.target.value)}
            placeholder="Order # or UUID — push to courier"
            className="text-xs border border-border rounded-md px-2 py-1.5 bg-background w-64"
          />
          <button onClick={pushOrderToSr} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
            <Plus className="h-3 w-3" /> Push
          </button>
          <button onClick={load} className="text-xs px-3 py-1.5 rounded-full bg-secondary flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading shipments…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">
          No shipments yet. Paid or COD orders will appear here automatically.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Order</th>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-left px-3 py-2">SR ID</th>
                  <th className="text-left px-3 py-2">AWB / Courier</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.created_at), "dd MMM, HH:mm")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-primary">{s.order?.order_number ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">₹{s.order?.total?.toLocaleString("en-IN") ?? "—"} · {s.order?.payment_status}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{s.order?.customer_name}</div>
                      <div className="text-muted-foreground">{s.order?.customer_phone}</div>
                      {s.order?.shipping_address?.pincode && (
                        <div className="text-[10px] text-muted-foreground">{s.order.shipping_address.city}, {s.order.shipping_address.pincode}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {s.sr_shipment_id ?? <span className="text-amber-700">not created</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {s.awb_code ? (
                        <>
                          <div className="font-mono">{s.awb_code}</div>
                          <div className="text-muted-foreground">{s.courier_name}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-primary capitalize">
                        {s.status.replace(/_/g, " ")}
                      </span>
                      {s.error && <div className="text-[10px] text-red-600 mt-1 max-w-xs">{s.error}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {!s.awb_code && s.sr_shipment_id && (
                          <button
                            disabled={busyId === s.id}
                            onClick={() => action(s.id, () => adminAssignAwb({ data: { shipment_id: s.id } }), "AWB assigned")}
                            className="text-[10px] px-2 py-1 rounded-full bg-primary text-primary-foreground"
                          >Assign AWB</button>
                        )}
                        {s.awb_code && s.status !== "cancelled" && (
                          <>
                            <button
                              disabled={busyId === s.id}
                              onClick={() => action(s.id, () => adminGeneratePickup({ data: { shipment_id: s.id } }), "Pickup scheduled")}
                              className="text-[10px] px-2 py-1 rounded-full bg-secondary flex items-center gap-1"
                            ><MapPin className="h-3 w-3" /> Pickup</button>
                            <button
                              disabled={busyId === s.id}
                              onClick={() => action(s.id, () => adminGenerateLabel({ data: { shipment_id: s.id } }), "Label ready")}
                              className="text-[10px] px-2 py-1 rounded-full bg-secondary flex items-center gap-1"
                            ><Package className="h-3 w-3" /> Label</button>
                            <button
                              disabled={busyId === s.id}
                              onClick={() => action(s.id, () => adminGenerateManifest({ data: { shipment_id: s.id } }), "Manifest ready")}
                              className="text-[10px] px-2 py-1 rounded-full bg-secondary flex items-center gap-1"
                            ><FileBox className="h-3 w-3" /> Manifest</button>
                            <button
                              disabled={busyId === s.id}
                              onClick={() => action(s.id, () => adminGenerateInvoice({ data: { shipment_id: s.id } }), "Invoice ready")}
                              className="text-[10px] px-2 py-1 rounded-full bg-secondary flex items-center gap-1"
                            ><FileText className="h-3 w-3" /> Invoice</button>
                            <button
                              disabled={busyId === s.id}
                              onClick={() => action(s.id, () => adminTrackShipment({ data: { shipment_id: s.id } }), "Tracking refreshed")}
                              className="text-[10px] px-2 py-1 rounded-full bg-secondary flex items-center gap-1"
                            ><RefreshCw className="h-3 w-3" /> Track</button>
                          </>
                        )}
                        {!s.error && s.sr_order_id && s.status !== "cancelled" && (
                          <button
                            disabled={busyId === s.id}
                            onClick={() => {
                              if (confirm("Cancel this shipment in Shiprocket?")) {
                                action(s.id, () => adminCancelShipment({ data: { shipment_id: s.id } }), "Shipment cancelled");
                              }
                            }}
                            className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1"
                          ><XCircle className="h-3 w-3" /> Cancel</button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {s.label_url && <a href={s.label_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline inline-flex items-center gap-0.5">label <ExternalLink className="h-2.5 w-2.5" /></a>}
                        {s.manifest_url && <a href={s.manifest_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline inline-flex items-center gap-0.5">manifest <ExternalLink className="h-2.5 w-2.5" /></a>}
                        {s.invoice_url && <a href={s.invoice_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline inline-flex items-center gap-0.5">invoice <ExternalLink className="h-2.5 w-2.5" /></a>}
                        {s.awb_code && <a href={`https://shiprocket.co/tracking/${s.awb_code}`} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline inline-flex items-center gap-0.5">track <ExternalLink className="h-2.5 w-2.5" /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}