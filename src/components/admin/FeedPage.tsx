import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, CheckCircle2, AlertTriangle, RefreshCw, Globe } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, PageHeader, Chip, btnGhost } from "@/components/admin/ui";
import { SITE_URL, catalogItems, googleXml, metaCsv } from "@/lib/feed";
import { catalogPreview, checkPublishedCatalog } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";

export function FeedPage({ kind }: { kind: "google" | "meta" }) {
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [checking, setChecking] = useState(false);
  const [published, setPublished] = useState<{ accessible: boolean; status: number; checkedAt: string } | null>(null);
  const feedUrl = kind === "google" ? `${SITE_URL}/api/public/catalog/google.xml` : `${SITE_URL}/api/public/catalog/meta.csv`;
  const q = useQuery({
    queryKey: ["feed-preview"],
    queryFn: () => catalogPreview(),
  });
  const all = catalogItems(q.data ?? []).map((item) => ({ item, row: (q.data ?? []).find((r) => r.id === item.productId) }));
  const ok = all.filter((a) => a.item.image).length;
  const withIssues = all.filter((a) => a.item.issues.length).length;
  const list = useMemo(() => (onlyIssues ? all.filter((a) => a.item.issues.length) : all), [all, onlyIssues]);

  const copy = async () => { try { await navigator.clipboard.writeText(feedUrl); toast.success("Feed link copied"); } catch { toast.error("Could not copy. Select and copy the feed link."); } };
  const check = async () => { setChecking(true); try { setPublished(await checkPublishedCatalog({ data: kind })); } catch (e) { toast.error(e instanceof Error ? e.message : "Check failed"); } finally { setChecking(false); } };
  const download = () => {
    const items = all.map((a) => a.item);
    const [content, type, name] = kind === "google" ? [googleXml(items), "application/xml", "google-feed.xml"] : [metaCsv(items), "text/csv", "meta-catalog.csv"];
    const a = document.createElement("a"); const url = URL.createObjectURL(new Blob([content], { type })); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const steps = kind === "google"
    ? ["In Merchant Center, open Settings → Data sources → Add product source → Add products from a file.", "Paste this file link and choose a daily scheduled update.", "Select India and English. Prices are supplied in INR. Verify and claim your store website, and complete shipping and return settings.", "Run the first fetch and review Google’s product diagnostics. Listing eligibility and approval are decided by Google."]
    : ["In Commerce Manager, select your catalog → Data sources → Add items → Data feed.", "Paste this file link and choose hourly or daily scheduled updates.", "Run the first import and review item errors. Facebook and Instagram availability depends on Meta’s eligibility checks.", "In WhatsApp Manager, connect the same catalog to your WhatsApp Business Platform account. Your business must own or have access to the catalog."];

  return (
    <div className="space-y-6">
      <PageHeader
        title={kind === "google" ? "Google Merchant Center" : "Meta & WhatsApp Catalog"}
        subtitle={kind === "google" ? "Show your products on Google Shopping and free listings." : "Sync products to Facebook, Instagram Shop and your WhatsApp catalog."}
        actions={<><Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className="h-4 w-4" />Refresh products</Button><Button disabled={!all.length} onClick={download}><Download className="h-4 w-4" />Download feed</Button></>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Published products</p><p className="text-2xl font-semibold mt-1">{q.data?.length ?? 0}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Included in feed</p><p className="text-2xl font-semibold mt-1 text-status-green">{ok}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Need attention</p><p className="text-2xl font-semibold mt-1 text-status-orange">{withIssues}</p></Card>
      </div>
      <section className="border-y border-border py-5 space-y-3">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="font-display text-xl">Catalog connection</h2><Chip tone="orange">External setup not verified</Chip></div>
        <p className="text-sm text-muted-foreground">Products, variations, images, INR prices and stock come from the same store records. Saved changes appear on the next scheduled fetch; this is not instant delivery to Google or Meta.</p>
        <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={checking} onClick={check}><Globe className="h-4 w-4" />{checking ? "Checking…" : "Check published feed"}</Button><Button asChild variant="outline"><a href={kind === "google" ? "https://merchants.google.com/" : "https://business.facebook.com/commerce/"} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{kind === "google" ? "Open Merchant Center" : "Open Commerce Manager"}</a></Button>{kind === "meta" && <Button asChild variant="outline"><a href="https://business.facebook.com/latest/whatsapp_manager" target="_blank" rel="noreferrer">Open WhatsApp Manager</a></Button>}</div>
        {published && <p role="status" className={`text-sm ${published.accessible ? "text-status-green" : "text-status-orange"}`}>{published.accessible ? "Published feed is publicly reachable. Confirm the first import in your catalog account." : `Published feed is not ready${published.status ? ` (HTTP ${published.status})` : ""}. Publish the updated website, then check again.`}</p>}
      </section>
      <section className="py-2">
        <h3 className="font-serif text-lg mb-2">Your live feed link</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <code className="flex-1 min-w-0 truncate rounded-lg bg-secondary px-3 py-2 text-sm">{feedUrl}</code>
          <button className={btnGhost} onClick={copy}><Copy className="h-4 w-4" />Copy</button>
          <a className={btnGhost} href={feedUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open</a>
        </div>
        <ol className="mt-4 space-y-2 text-sm list-decimal pl-5">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>
      <section className="py-2">
        <h3 className="font-serif text-lg mb-1">Multi-channel sync schedule</h3>
        <p className="text-sm text-muted-foreground mb-3">Paste the matching link once in each platform and set its schedule. Every fetch reads live products, prices and stock — no code or manual uploads needed.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 pr-3">Channel</th><th className="pr-3">Feed link</th><th className="pr-3">Set schedule to</th><th></th></tr></thead>
          <tbody>{[
            ["Google Shopping / Merchant Center", `${SITE_URL}/api/public/catalog/google.xml`, "Daily (Google's fastest file schedule)", "https://merchants.google.com/"],
            ["Facebook & Instagram Shop", `${SITE_URL}/api/public/catalog/meta.csv`, "Hourly", "https://business.facebook.com/commerce/"],
            ["WhatsApp catalog", `${SITE_URL}/api/public/catalog/meta.csv`, "Hourly (via the Meta catalog)", "https://business.facebook.com/latest/whatsapp_manager"],
            ["Pinterest Catalogs", `${SITE_URL}/api/public/catalog/google.xml`, "Daily", "https://www.pinterest.com/business/catalogs/"],
            ["TikTok Shop / Catalog", `${SITE_URL}/api/public/catalog/google.xml`, "Hourly", "https://ads.tiktok.com/i18n/catalog"],
          ].map(([name, url, freq, open]) => (
            <tr key={name} className="border-b border-border/60">
              <td className="py-2 pr-3 font-medium">{name}</td>
              <td className="pr-3"><code className="text-xs break-all">{url}</code></td>
              <td className="pr-3">{freq}</td>
              <td className="whitespace-nowrap"><button className={btnGhost} onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Copy failed"); } }}><Copy className="h-4 w-4" /></button><a className={btnGhost} href={open} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></td>
            </tr>))}</tbody>
        </table></div>
      </section>
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
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-2 pr-3"><div className="flex items-center gap-2">{item.image ? <img src={item.image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-secondary" />}<Link to="/admin/products/$id" params={{ id: row?.id ?? item.productId ?? item.id }} className="hover:underline">{item.title}</Link></div></td>
                  <td className="pr-3 text-muted-foreground">{item.id.slice(0, 18)}</td>
                  <td className="pr-3">{item.salePrice ?? item.price}</td>
                  <td className="pr-3">{item.availability}</td>
                  <td>{item.issues.length ? <span className="inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-status-orange" /><Chip tone={item.image ? "orange" : "red"}>{item.issues.join(", ")}</Chip></span> : <span className="inline-flex items-center gap-1 text-status-green"><CheckCircle2 className="h-4 w-4" />Ready</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
