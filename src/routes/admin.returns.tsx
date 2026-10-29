import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminReportData } from "@/lib/admin-audit.functions";
import { adminPageMeta } from "@/lib/page-meta";
import { Card, PageHeader, Chip, inr, inputCls } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/returns")({ head: () => ({ meta: adminPageMeta("Returns & Refunds") }), component: Page });
function Page() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const q = useQuery({ queryKey: ["returns-report"], queryFn: () => adminReportData() });
  const rows = (q.data?.orders ?? []).filter((o) => ["returned", "refunded", "cancelled"].includes(o.status) && (status === "all" || status === o.status) && `${o.order_number} ${o.customer_name}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4"><PageHeader title="Returns & Refunds" subtitle="Returned and cancelled orders, with payment reconciliation." />
    <div className="flex flex-wrap gap-3"><input className={inputCls} placeholder="Search order or customer" value={search} onChange={(e) => setSearch(e.target.value)} /><select aria-label="Return status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="returned">Returned</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select></div>
    <p className="text-sm text-muted-foreground">Refund payments in Razorpay first, then sync the payment status from the order.</p>
    {q.error && <p role="alert" className="text-status-red">{q.error.message}</p>}
    <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left bg-secondary"><tr>{["Order", "Customer", "Total", "Status", "Payment", "Actions"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map((o) => <tr key={o.id} className="border-t border-border"><td className="p-3">{o.order_number}</td><td className="p-3">{o.customer_name}</td><td className="p-3">{inr(o.total)}</td><td className="p-3"><Chip tone="red">{o.status}</Chip></td><td className="p-3">{o.payment_status}</td><td className="p-3"><Link to="/admin/orders/$id" params={{ id: o.id }} className="text-primary underline">Open order</Link></td></tr>)}{!rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{q.isLoading ? "Loading…" : "No matching returns or cancellations."}</td></tr>}</tbody></table></Card></div>;
}