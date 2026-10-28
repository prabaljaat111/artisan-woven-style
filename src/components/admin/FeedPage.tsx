import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, Chip, btnGhost, btnPrimary, inr } from "@/components/admin/ui";
import { SITE_URL, toFeedItem, googleXml, metaCsv, type FeedRow } from "@/lib/feed";

export function FeedPage({ kind }: { kind: "google" | "meta" }) {
  const [onlyIssues, setOnlyIssues] = useState(false);
  const feedUrl = kind === "google" ? `${SITE_URL}/feeds/google.xml` : `${SITE_URL}/feeds/meta.csv`;
  const q = useQuery({
    queryKey: ["feed-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,sku,description,short_description,price,original_price,stock,images,color,sizes,categories(name)")
        .eq("is_published", true).is("deleted_at", null).order("menu_order");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ row: r as FeedRow, item: toFeedItem({ ...r, category_name: r.categories?.name ?? null }) }));
    },
  });
  const all = q.data ?? [];
  const ok = all.filter((a) => a.item.image).length;
  const withIssues = all.filter((a) => a.item.issues.length).length;
  const list = useMemo(() => (onlyIssues ? all.filter((a) => a.item.issues.length) : all), [all, onlyIssues]);

  const copy = () => { navigator.clipboard.writeText(feedUrl); toast.success("Feed link copied"); };
  const download = () => {
    const items = all.map((a) => a.item);
    const [content, type, name] = kind === "google" ? [googleXml(items), "application/xml", "google-feed.xml"] : [metaCsv(items), "text/csv", "meta-catalog.csv"];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  };

  const steps = kind === "google"
    ? ["Open merchants.google.com and choose Products → Add products → Add from file.", "Pick “Add a file link”, paste the feed link below, and set the schedule to Daily.", "Set country India, language English, currency INR, then click Continue.", "Google re-reads the link every day, so new and edited products sync automatically."]
    : ["Open Meta Commerce Manager → Catalog → Data sources → Add items → Data feed.", "Choose “Use a URL”, paste the feed link below, and schedule hourly or daily updates.", "Currency INR. Products then appear in Facebook & Instagram Shops.", "For WhatsApp: WhatsApp Manager → Catalog → Connect this catalog to your business number."];

  return (
    <div className="space-y-6">
      <PageHeader
        title={kind === "google" ? "Google Merchant Center" : "Meta & WhatsApp Catalog"}
        subtitle={kind === "google" ? "Show your products on Google Shopping and free listings." : "Sync products to Facebook, Instagram Shop and your WhatsApp catalog."}
        actions={<button className={btnPrimary} onClick={download}><Download className="h-4 w-4" />Download feed</button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Published products</p><p className="text-2xl font-semibold mt-1">{all.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Included in feed</p><p className="text-2xl font-semibold mt-1 text-success">{ok}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Need attention</p><p className="text-2xl font-semibold mt-1 text-warning">{withIssues}</p></Card>
      </div>
      <Card>
        <h3 className="font-serif text-lg mb-2">Your live feed link</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <code className="flex-1 min-w-0 truncate rounded-lg bg-secondary px-3 py-2 text-sm">{feedUrl}</code>
          <button className={btnGhost} onClick={copy}><Copy className="h-4 w-4" />Copy</button>
          <a className={btnGhost} href={feedUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open</a>
        </div>
        <ol className="mt-4 space-y-2 text-sm list-decimal pl-5">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg">Products in feed</h3>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />Only show problems</label>
        </div>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 pr-3">Product</th><th className="pr-3">ID</th><th className="pr-3">Price</th><th className="pr-3">Availability</th><th>Status</th></tr></thead>
              <tbody>{list.map(({ row, item }) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-2 pr-3"><div className="flex items-center gap-2">{item.image ? <img src={item.image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-secondary" />}<Link to="/admin/products/$id" params={{ id: row.id }} className="hover:underline">{row.name}</Link></div></td>
                  <td className="pr-3 text-muted-foreground">{item.id.slice(0, 18)}</td>
                  <td className="pr-3">{inr(row.price)}</td>
                  <td className="pr-3">{item.availability}</td>
                  <td>{item.issues.length ? <span className="inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-warning" /><Chip tone={item.image ? "orange" : "red"}>{item.issues.join(", ")}</Chip></span> : <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />Ready</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
