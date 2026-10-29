import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { adminPageMeta } from "@/lib/page-meta";
import { adminReportData } from "@/lib/admin-audit.functions";
import { PageHeader, Card, inr, inputCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin/settings/reports")({ head: () => ({ meta: adminPageMeta("Sales & Inventory Reports") }), component: Page });
function Page() {
  const q = useQuery({ queryKey: ["report-data"], queryFn: () => adminReportData() });
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const rows = (q.data?.orders ?? []).filter((o) => (!from || o.created_at.slice(0,10) >= from) && (!to || o.created_at.slice(0,10) <= to));
  const paid = rows.filter((o) => o.payment_status === "paid" && !["cancelled", "returned", "refunded"].includes(o.status));
  const revenue = paid.reduce((n,o) => n + Number(o.total), 0);
  function download(type: 'orders' | 'products') { const data = type === 'orders' ? rows : q.data?.products ?? []; if (!data.length) return; const keys = Object.keys(data[0]); const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`; const text = [keys.map(esc).join(','), ...data.map((r) => keys.map((k) => esc((r as any)[k])).join(','))].join('\n'); const url = URL.createObjectURL(new Blob(['\uFEFF'+text], {type:'text/csv;charset=utf-8'})); Object.assign(document.createElement('a'), {href:url,download:`ihs-${type}-${new Date().toISOString().slice(0,10)}.csv`}).click(); URL.revokeObjectURL(url); }
  return <div className="space-y-5"><PageHeader title="Sales & Inventory Reports" /><div className="flex flex-wrap gap-3"><input aria-label="Report from date" type="date" className={inputCls} value={from} onChange={(e)=>setFrom(e.target.value)} /><input aria-label="Report to date" type="date" className={inputCls} min={from} value={to} onChange={(e)=>setTo(e.target.value)} /><Button disabled={!rows.length} onClick={()=>download('orders')}><Download className="h-4 w-4" />Export orders</Button><Button variant="outline" disabled={!q.data?.products.length} onClick={()=>download('products')}><Download className="h-4 w-4" />Export inventory</Button></div>{q.error && <p role="alert" className="text-status-red">{q.error.message}</p>}<div className="grid sm:grid-cols-3 gap-4">{[['Paid sales',inr(revenue)],['Orders',rows.length],['Average paid order',inr(paid.length ? revenue / paid.length : 0)]].map(([k,v])=><Card key={k} className="p-5"><h2 className="text-sm text-muted-foreground">{k}</h2><p className="text-2xl font-semibold mt-2">{q.isLoading ? '…' : v}</p></Card>)}</div><p className="text-sm text-muted-foreground">Paid sales exclude cancellations and returns. Reports include up to the latest 1,000 orders and 1,000 products.</p><Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary text-left"><tr>{['Order','Date','Customer','Status','Payment','Total'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(o=><tr key={o.id} className="border-t border-border"><td className="p-3">{o.order_number}</td><td className="p-3">{o.created_at.slice(0,10)}</td><td className="p-3">{o.customer_name}</td><td className="p-3">{o.status}</td><td className="p-3">{o.payment_status}</td><td className="p-3">{inr(o.total)}</td></tr>)}</tbody></table></Card></div>;
}
