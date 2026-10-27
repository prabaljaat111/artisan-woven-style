import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, Chip, inputCls, btnGhost } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { STOCK_REASONS } from "@/components/admin/AdjustStockModal";

const PAGE = 25;
const TYPE_LABEL: Record<string, string> = { add: "Added", increase: "Added", reduce: "Reduced", decrease: "Reduced", set: "Set" };

export function StockHistory({ products }: { products: { productId: string; name: string }[] }) {
  const [product, setProduct] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [user, setUser] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);

  const productOpts = useMemo(() => [...new Map(products.map((p) => [p.productId, p.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [products]);

  const { data, isLoading } = useQuery({
    queryKey: ["stock-history", product, from, to, user, reason, page],
    queryFn: async () => {
      let q = supabase.from("stock_logs").select("id, product_id, variation_id, adjustment_type, quantity, previous_stock, new_stock, reason, notes, user_id, created_at, products(name), product_variants(size, color, sku)", { count: "exact" }).order("created_at", { ascending: false });
      if (product) q = q.eq("product_id", product);
      if (user) q = q.eq("user_id", user);
      if (reason) q = q.ilike("reason", `${reason}%`);
      if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      const { data, count, error } = await q.range((page - 1) * PAGE, page * PAGE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ["stock-history-users"],
    queryFn: async () => {
      const { data: logs } = await supabase.from("stock_logs").select("user_id").not("user_id", "is", null).limit(1000);
      const ids = [...new Set((logs ?? []).map((l) => l.user_id as string))];
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      return ids.map((id) => ({ id, name: profs?.find((p) => p.id === id)?.full_name || `User ${id.slice(0, 6)}` }));
    },
  });
  const userName = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? `User ${id.slice(0, 6)}` : "System");
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));
  const f = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPage(1); };
  const hasFilters = product || from || to || user || reason;

  return (
    <div>
      <Card className="p-3 mb-4 flex flex-wrap gap-2 items-center">
        <select className={inputCls} value={product} onChange={f(setProduct)} aria-label="Product"><option value="">All products</option>{productOpts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <label className="text-sm flex items-center gap-1.5">From <input type="date" className={inputCls} value={from} max={to || undefined} onChange={f(setFrom)} /></label>
        <label className="text-sm flex items-center gap-1.5">To <input type="date" className={inputCls} value={to} min={from || undefined} onChange={f(setTo)} /></label>
        <select className={inputCls} value={user} onChange={f(setUser)} aria-label="User"><option value="">All users</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <select className={inputCls} value={reason} onChange={f(setReason)} aria-label="Reason"><option value="">All reasons</option>{STOCK_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
        {hasFilters && <button className="text-sm underline" onClick={() => { setProduct(""); setFrom(""); setTo(""); setUser(""); setReason(""); setPage(1); }}>Clear</button>}
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Type</th><th className="p-3">Change</th><th className="p-3">Previous → New</th><th className="p-3">Reason</th><th className="p-3">User</th></tr></thead>
          <tbody>
            {isLoading && [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-8" /></td></tr>)}
            {!isLoading && !data?.rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No stock changes found.</td></tr>}
            {data?.rows.map((l: any) => {
              const diff = l.new_stock - l.previous_stock;
              const v = l.product_variants;
              return (
                <tr key={l.id} className="border-t border-border/60 align-top">
                  <td className="p-3 whitespace-nowrap">{format(new Date(l.created_at), "d MMM yyyy")}<div className="text-xs text-muted-foreground">{format(new Date(l.created_at), "HH:mm")}</div></td>
                  <td className="p-3"><div className="font-medium">{l.products?.name ?? "Deleted product"}</div>{v && <div className="text-xs text-muted-foreground">{[v.size, v.color].filter(Boolean).join(" / ")}{v.sku ? ` · ${v.sku}` : ""}</div>}</td>
                  <td className="p-3"><Chip tone={diff > 0 ? "green" : diff < 0 ? "red" : "gray"}>{TYPE_LABEL[l.adjustment_type] ?? l.adjustment_type}</Chip></td>
                  <td className={`p-3 tabular-nums font-medium ${diff > 0 ? "text-status-green" : diff < 0 ? "text-status-red" : ""}`}>{diff > 0 ? `+${diff}` : diff}</td>
                  <td className="p-3 tabular-nums">{l.previous_stock} → <b>{l.new_stock}</b></td>
                  <td className="p-3">{l.reason ?? "—"}{l.notes && <div className="text-xs text-muted-foreground max-w-[220px]">{l.notes}</div>}</td>
                  <td className="p-3 text-muted-foreground">{userName(l.user_id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(data?.count ?? 0) > 0 && (
          <div className="flex items-center justify-between p-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Showing {(page - 1) * PAGE + 1} to {Math.min(page * PAGE, data!.count)} of {data!.count}</span>
            <div className="flex gap-1 items-center"><button className={btnGhost} disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button><span className="px-2">{page} / {pages}</span><button className={btnGhost} disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button></div>
          </div>
        )}
      </Card>
    </div>
  );
}
