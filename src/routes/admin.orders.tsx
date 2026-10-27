import { adminPageMeta } from "@/lib/page-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Search, RefreshCw } from "lucide-react";
import { ordersList } from "@/lib/orders-admin.functions";
import { ORDER_STATUSES, STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/lib/order-workflow";
import { Card, PageHeader, Chip, inr, inputCls, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
  head: () => ({ meta: adminPageMeta("Orders") }),
});

const PAY_TONE: Record<string, "green" | "orange" | "red" | "gray"> = { paid: "green", unpaid: "orange", failed: "red", refunded: "gray" };

function OrdersPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [payment, setPayment] = useState<"all" | "unpaid" | "paid" | "failed" | "refunded">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const input = { status, payment, q, page, from: from ? new Date(from).toISOString() : null, to: to ? new Date(to + "T23:59:59").toISOString() : null };
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["admin-orders", input], queryFn: () => ordersList({ data: input }), placeholderData: keepPreviousData });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const totalAll = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="space-y-4">
      <PageHeader title={`Orders (${totalAll})`} subtitle="Track, process and ship customer orders." actions={<button className={btnGhost} onClick={() => refetch()}><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>} />

      <div className="flex flex-wrap gap-2">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button key={s} onClick={() => reset(() => setStatus(s))} className={`text-xs px-3 py-1.5 rounded-full border ${status === s ? "bg-admin-nav text-admin-nav-foreground border-admin-nav" : "bg-card border-border"}`}>
            {s === "all" ? "All" : STATUS_LABEL[s]} <span className="opacity-70">({s === "all" ? totalAll : data?.counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <input value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Search order #, customer name, email or phone" className={`${inputCls} w-full pl-9`} />
        </div>
        <select value={payment} onChange={(e) => reset(() => setPayment(e.target.value as any))} className={inputCls} aria-label="Payment">
          <option value="all">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
        </select>
        <input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} className={inputCls} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))} className={inputCls} aria-label="To date" />
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground text-left">
              <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3 text-right">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Tracking</th></tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-8 w-full" /></td></tr>)}
              {data?.rows.map((o: any) => (
                <tr key={o.id} onClick={() => nav({ to: "/admin/orders/$id", params: { id: o.id } })} className="cursor-pointer border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td className="p-3 text-xs whitespace-nowrap">{format(new Date(o.created_at), "dd MMM yyyy, HH:mm")}</td>
                  <td className="p-3">{o.customer_name}<div className="text-xs text-muted-foreground">{o.customer_phone || o.customer_email}</div></td>
                  <td className="p-3 text-right font-semibold">{inr(o.total)}</td>
                  <td className="p-3"><Chip tone={PAY_TONE[o.payment_status] ?? "gray"}>{o.payment_status}</Chip><div className="text-[11px] text-muted-foreground mt-0.5">{o.payment_method}</div></td>
                  <td className="p-3"><Chip tone={STATUS_TONE[o.status as OrderStatus] ?? "gray"}>{STATUS_LABEL[o.status as OrderStatus] ?? o.status}</Chip></td>
                  <td className="p-3 font-mono text-xs">{o.tracking_number || "—"}</td>
                </tr>
              ))}
              {data && data.rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No orders match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t border-border text-sm">
          <span className="text-muted-foreground">{data?.total ?? 0} orders</span>
          <div className="flex gap-2 items-center">
            <button className={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button className={btnGhost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
