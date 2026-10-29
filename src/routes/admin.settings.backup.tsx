import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminPageMeta } from "@/lib/page-meta";
import { exportStoreBackup, restoreStoreBackup, integrationStatus } from "@/lib/admin-audit.functions";
import { PageHeader, Card, Chip } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings/backup")({ head: () => ({ meta: adminPageMeta("Backup & Restore") }), component: Page });
function Page() {
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<any>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const health = useQuery({ queryKey: ["integration-status"], queryFn: () => integrationStatus() });
  async function download() {
    setBusy(true);
    try {
      const data = await exportStoreBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      Object.assign(document.createElement("a"), { href: url, download: `ihs-catalog-${new Date().toISOString().slice(0, 10)}.json` }).click();
      URL.revokeObjectURL(url); toast.success("Backup downloaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Backup failed"); } finally { setBusy(false); }
  }
  async function restore() {
    if (!backup || !confirm("Restore catalog and settings from this file? Matching records will be overwritten. Download a fresh backup first.")) return;
    setBusy(true);
    try { const r = await restoreStoreBackup({ data: backup }); setMessage(`Restored ${(r as any)?.restored ?? 0} records successfully.`); toast.success("Catalog restored"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Restore failed — no changes applied"); } finally { setBusy(false); }
  }
  return <div className="max-w-4xl space-y-6"><PageHeader title="Backup & Restore" subtitle="Download and restore your catalog and store settings." />
    <section className="space-y-3"><h2 className="font-display text-xl">Catalog backup</h2><p className="text-sm text-muted-foreground">Includes products, variations, categories, brands, attributes, coupons and settings. Images are saved as links; image files, customer accounts, orders, payments and history are not included.</p><Button disabled={busy} onClick={download}><Download className="h-4 w-4" />Download backup</Button></section>
    <section className="border-t border-border pt-6 space-y-3"><h2 className="font-display text-xl">Restore catalog</h2><p className="text-sm text-muted-foreground">Restores matching records without deleting newer records. All changes apply together; invalid files leave your catalog unchanged.</p><input aria-label="Choose backup file" type="file" accept=".json,application/json" disabled={busy} onChange={async (e) => { const f = e.target.files?.[0]; setBackup(null); setMessage(""); if (!f) return; if (f.size > 20 * 1024 * 1024) return toast.error("Maximum backup size is 20 MB"); try { const v = JSON.parse(await f.text()); if (v.format !== "ihs-catalog-backup" || v.version !== 1 || !v.tables) throw new Error("Choose an IHS catalog backup"); setBackup(v); setName(f.name); } catch (err) { toast.error(err instanceof Error ? err.message : "Invalid file"); } }} />{backup && <p className="text-sm">{name} · {Object.values(backup.tables).reduce((n: number, r: any) => n + (Array.isArray(r) ? r.length : 0), 0)} records</p>}<Button disabled={!backup || busy} variant="outline" onClick={restore}><Upload className="h-4 w-4" />Restore catalog</Button>{message && <p role="status" className="text-status-green">{message}</p>}</section>
    <section className="border-t border-border pt-6 space-y-3"><div className="flex justify-between"><h2 className="font-display text-xl">Connection status</h2><Button variant="ghost" size="icon" aria-label="Refresh connections" onClick={() => health.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>{health.error ? <p className="text-status-red">{health.error.message}</p> : <div className="grid sm:grid-cols-3 gap-3">{([['Database', health.data?.database], ['Razorpay credentials', health.data?.razorpay], ['Shiprocket credentials', health.data?.shiprocket]] as const).map(([label, ready]) => <Card key={label} className="p-4 space-y-2"><h3 className="text-sm font-medium">{label}</h3><Chip tone={ready ? "green" : "orange"}>{health.isLoading ? "Checking…" : ready ? label === 'Database' ? 'Connected' : 'Present, not verified' : 'Not configured'}</Chip></Card>)}</div>}</section>
  </div>;
}
