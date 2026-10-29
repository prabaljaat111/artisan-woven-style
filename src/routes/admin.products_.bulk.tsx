import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { format } from "date-fns";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Chip, inputCls, btnPrimary, btnGhost } from "@/components/admin/ui";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { IMPORT_FIELDS, autoMap, parseRows, buildExportRows, EXPORT_COLUMNS, SAMPLE_CSV, type Mapping, type ParsedRow, type ExportColumn } from "@/lib/woo-csv";

export const Route = createFileRoute("/admin/products_/bulk")({
  component: BulkPage,
  head: () => ({ meta: adminPageMeta("Bulk Import / Export") }),
});

const MAX_BYTES = 50 * 1024 * 1024;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "product";
function download(name: string, blob: Blob) { const url = URL.createObjectURL(blob); Object.assign(document.createElement("a"), { href: url, download: name }).click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function allProducts() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("products").select("id, sku, slug, product_type").is("deleted_at", null).order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}
async function allVariants() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("product_variants").select("id, sku, product_id, size, color").order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}

function BulkPage() {
  const [tab, setTab] = useState<"import" | "export">("import");
  return (
    <div>
      <PageHeader title="Bulk Import / Export" subtitle="Move products in and out using WooCommerce-compatible CSV files." />
      <div className="flex gap-1 border-b border-border mb-5">
        {([["import", "Import Products"], ["export", "Export Products"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${tab === k ? "border-admin-nav font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      {tab === "import" ? <ImportTab /> : <ExportTab />}
      <ImportHistory />
    </div>
  );
}

// ---------------- IMPORT ----------------
type Step = "upload" | "map" | "preview" | "running" | "done";
type Result = { created: number; updated: number; failed: number; errors: { line: number; sku: string; error: string }[] };

function ImportTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [updateExisting, setUpdateExisting] = useState(true);
  const [createCats, setCreateCats] = useState(false);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const catsQuery = useQuery({ queryKey: ["bulk-cats"], queryFn: async () => { const { data, error } = await supabase.from("categories").select("id, name, slug"); if (error) throw error; return data ?? []; } });
  const cats = catsQuery.data ?? [];
  const existingQuery = useQuery({ queryKey: ["bulk-skus"], enabled: step !== "upload", queryFn: allProducts });
  const existing = existingQuery.data ?? [];

  const parsed: ParsedRow[] = useMemo(() => step === "preview" || step === "running"
    ? parseRows(raw, mapping, { knownCategories: cats.flatMap((c) => [c.name, c.slug]), createMissingCategories: createCats, existingSkus: existing.filter((e) => e.product_type === "variable").map((e) => e.sku).filter(Boolean) as string[] })
    : [], [step, raw, mapping, cats, createCats, existing]);
  const invalid = parsed.filter((r) => r.errors.length).length;

  function pick(f: File) {
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") return toast.error("Please choose a .csv file");
    if (f.size > MAX_BYTES) return toast.error("File is larger than 50 MB");
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
      complete: (res) => {
        if (res.errors.length) return toast.error(`CSV row ${(res.errors[0].row ?? 0) + 2}: ${res.errors[0].message}`);
        const hs = (res.meta.fields ?? []).filter(Boolean);
        if (!hs.length || !res.data.length) return toast.error("This CSV has no rows");
        if (res.data.length > 20000) return toast.error("Max 20,000 rows per file");
        setFile(f); setHeaders(hs); setRaw(res.data); setMapping(autoMap(hs)); setStep("map");
      },
      error: (e) => toast.error(`Couldn't read file: ${e.message}`),
    });
  }

  async function runImport() {
    if (!user || !file) return toast.error("Please sign in again before importing");
    if (catsQuery.error || existingQuery.error || existingQuery.isFetching || catsQuery.isFetching) return toast.error("Wait for catalog data to load before importing");
    const importRows = parsed;
    let jobId: string | null = null;
    setStep("running"); setProgress(0);
    const res: Result = { created: 0, updated: 0, failed: 0, errors: [] };
    const fail = (r: ParsedRow, error: string) => { res.failed++; res.errors.push({ line: r.line, sku: r.sku, error }); };
    try {
    const { data: job, error: jobError } = await supabase.from("import_jobs").insert({ file_name: file.name.slice(0, 200), user_id: user.id, user_email: user.email ?? null, total: importRows.length }).select("id").single();
    if (jobError || !job) throw new Error(jobError?.message ?? "Could not start import history");
    jobId = job.id;

    // categories
    const catMap = new Map(cats.flatMap((c) => [[c.name.toLowerCase(), c.id], [c.slug.toLowerCase(), c.id]] as [string, string][]));
    if (createCats) {
      const missing = [...new Set(importRows.filter((r) => !r.errors.length && r.type !== "variation" && r.category && !catMap.has(r.category.toLowerCase())).map((r) => r.category).filter((name): name is string => !!name))];
      for (const name of missing) {
        const { data, error } = await supabase.from("categories").insert({ name, slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 5)}` }).select("id").single();
        if (data) catMap.set(name.toLowerCase(), data.id); else toast.error(`Couldn't create category ${name}: ${error?.message}`);
      }
    }
    const skuToId = new Map(existing.flatMap((e) => e.sku ? [[e.sku.toLowerCase(), e.id] as const] : []));
    const skuCounts = new Map<string, number>();
    existing.forEach((e) => { if (e.sku) skuCounts.set(e.sku.toLowerCase(), (skuCounts.get(e.sku.toLowerCase()) ?? 0) + 1); });
    const existingVars = await allVariants();
    const varBySku = new Map(existingVars.flatMap((v) => v.sku ? [[v.sku.toLowerCase(), v] as const] : []));
    const slugs = new Set(existing.map((e) => e.slug));
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("products").select("slug").order("id").range(offset, offset + 499);
      if (error) throw error;
      (data ?? []).forEach((p) => slugs.add(p.slug));
      if ((data?.length ?? 0) < 500) break;
    }
    const uniqueSlug = (name: string) => { let s = slugify(name), i = 2; while (slugs.has(s)) s = `${slugify(name)}-${i++}`; slugs.add(s); return s; };
    const parents = importRows.filter((r) => r.type !== "variation");
    const variations = importRows.filter((r) => r.type === "variation");
    let done = 0;
    const tick = () => setProgress(Math.round((++done / importRows.length) * 100));
    const imported = new Set<string>();

    for (const r of parents) {
      if (r.errors.length) { fail(r, r.errors.join("; ")); tick(); continue; }
      const existingId = skuToId.get(r.sku.toLowerCase());
      if ((skuCounts.get(r.sku.toLowerCase()) ?? 0) > 1) { fail(r, "Multiple products use this SKU; give them unique SKUs first"); tick(); continue; }
      if (varBySku.has(r.sku.toLowerCase())) { fail(r, "SKU belongs to an existing variation"); tick(); continue; }
      if (r.type === "simple" && existingId && existingVars.some((v) => v.product_id === existingId)) { fail(r, "Product has variations; keep its type Variable or remove variations in the editor first"); tick(); continue; }
      if (existingId && !updateExisting) { fail(r, "SKU already exists (updating is off)"); tick(); continue; }
      const regular = r.regular_price ?? 0;
      const payload: Record<string, unknown> = {
        name: r.name, sku: r.sku, short_description: r.short_description || null, description: r.description || r.short_description || r.name,
        category_id: catMap.get((r.category ?? "").toLowerCase()) ?? null, product_type: r.type, featured: r.featured,
        original_price: regular, price: r.sale_price ?? regular, on_sale: r.sale_price !== null,
        status: r.published ? "active" : "draft", is_published: r.published,
        weight: r.weight, length_cm: r.length, width_cm: r.width, height_cm: r.height,
      };
      if (!payload.category_id) { fail(r, "Category could not be created or found"); tick(); continue; }
      if (existingId) {
        if (!mapping.published) { delete payload.status; delete payload.is_published; }
        if (!mapping.featured) delete payload.featured;
        if (!mapping.short_description) delete payload.short_description;
        if (!mapping.description) delete payload.description;
        for (const [field, column] of [["weight", "weight"], ["length", "length_cm"], ["width", "width_cm"], ["height", "height_cm"]] as const) if (!mapping[field]) delete payload[column];
      }
      if (r.images.length) payload.images = r.images;
      if (r.type === "simple" && r.stock !== null) payload.stock = r.stock;
      const sizeAttr = r.attributes.find((a) => /size/i.test(a.name)), colorAttr = r.attributes.find((a) => /colou?r/i.test(a.name));
      if (sizeAttr?.values.length) payload.sizes = sizeAttr.values;
      if (colorAttr?.values.length) { payload.colors = colorAttr.values; payload.color = colorAttr.values[0]; }
      const q = existingId
        ? await supabase.from("products").update(payload as any).eq("id", existingId).select("id").single()
        : await supabase.from("products").insert({ ...payload, slug: uniqueSlug(r.name), submitted_by: user.id } as any).select("id").single();
      if (q.error || !q.data) fail(r, q.error?.message ?? "Save failed");
      else { existingId ? res.updated++ : res.created++; skuToId.set(r.sku.toLowerCase(), q.data.id); imported.add(r.sku.toLowerCase()); }
      tick();
    }

    // variations grouped by parent
    for (const r of variations) {
      const pid = skuToId.get(r.parent.toLowerCase());
      const parentInFile = parents.some((p) => p.sku.toLowerCase() === r.parent.toLowerCase());
      if (parentInFile && !imported.has(r.parent.toLowerCase())) { fail(r, "Parent product failed to import; variation left unchanged"); tick(); continue; }
      if (r.errors.length || !pid) { fail(r, r.errors.join("; ") || "Parent product failed to import"); tick(); continue; }
      const payload = { product_id: pid, sku: r.sku, size: r.size ?? "One Size", color: r.color, stock: r.stock ?? 0, price: r.regular_price, sale_price: r.sale_price, image_url: r.images[0] ?? null, status: r.published ? "active" : "inactive" };
      if (skuToId.has(r.sku.toLowerCase())) { fail(r, "SKU belongs to an existing product"); tick(); continue; }
      const ev = varBySku.get(r.sku.toLowerCase()) ?? existingVars.find((v) => v.product_id === pid && v.size.toLowerCase() === payload.size.toLowerCase() && (v.color ?? "").toLowerCase() === (payload.color ?? "").toLowerCase());
      if (ev && ev.product_id !== pid) { fail(r, "SKU belongs to a variation of another product"); tick(); continue; }
      if (ev && !updateExisting) { fail(r, "SKU already exists (updating is off)"); tick(); continue; }
      const q = ev ? await supabase.from("product_variants").update(payload).eq("id", ev.id) : await supabase.from("product_variants").insert(payload);
      if (q.error) fail(r, q.error.message); else ev ? res.updated++ : res.created++;
      tick();
    }

    const status = res.failed === 0 ? "completed" : res.created + res.updated > 0 ? "partial" : "failed";
    const { error: finishError } = await supabase.from("import_jobs").update({ status, created_count: res.created, updated_count: res.updated, failed_count: res.failed, errors: res.errors.slice(0, 2000), finished_at: new Date().toISOString() }).eq("id", job.id);
    if (finishError) toast.error(`Products processed, but history could not finish: ${finishError.message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      for (const row of importRows) if (!res.errors.some((e) => e.line === row.line)) { if (res.created + res.updated + res.failed >= importRows.length) break; fail(row, message); }
      if (jobId) await supabase.from("import_jobs").update({ status: "failed", created_count: res.created, updated_count: res.updated, failed_count: res.failed, errors: res.errors, finished_at: new Date().toISOString() }).eq("id", jobId);
      toast.error(message);
    }
    setResult(res); setStep("done");
    qc.invalidateQueries({ queryKey: ["import-history"] }); qc.invalidateQueries({ queryKey: ["bulk-skus"] }); qc.invalidateQueries({ queryKey: ["bulk-cats"] });
  }

  const reset = () => { setStep("upload"); setFile(null); setRaw([]); setHeaders([]); setResult(null); setProgress(0); };

  if (step === "upload") return (
    <Card className="p-6">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
        onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition ${drag ? "border-admin-nav bg-admin-nav/5" : "border-border hover:border-admin-nav/50"}`}>
        <UploadCloud className="h-10 w-10 mx-auto text-admin-nav" />
        <div className="mt-3 font-display text-xl">Upload CSV File</div>
        <p className="text-sm text-muted-foreground mt-1">Drag and drop your CSV here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-2">Supports WooCommerce CSV format · Max 50 MB</p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <button className="text-sm underline text-admin-nav inline-flex items-center gap-1" onClick={() => download("ihs-sample-products.csv", new Blob(["\uFEFF" + SAMPLE_CSV], { type: "text/csv" }))}><Download className="h-4 w-4" /> Download Sample CSV File</button>
        <button className={btnPrimary} onClick={() => inputRef.current?.click()}><FileSpreadsheet className="h-4 w-4" /> Import Products</button>
      </div>
    </Card>
  );

  if (step === "map") return (
    <Card className="p-6">
      <h3 className="font-display text-xl">Map columns</h3>
      <p className="text-sm text-muted-foreground mb-4">{file?.name} · {raw.length.toLocaleString("en-IN")} rows. Match your file's columns to product fields. Attribute columns (“Attribute 1 name / value(s)”) are read automatically.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {IMPORT_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 font-medium">{f.label}{["sku", "name", "regular_price", "categories"].includes(f.key) && <span className="text-status-red"> *</span>}</span>
            <select className={`${inputCls} flex-1`} value={mapping[f.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}>
              <option value="">— Don't import —</option>{headers.map((h) => <option key={h}>{h}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-6"><button className={btnGhost} onClick={reset}><ArrowLeft className="h-4 w-4" /> Back</button><button className={btnPrimary} disabled={!mapping.sku} onClick={() => setStep("preview")}>Continue to preview</button></div>
    </Card>
  );

  if (step === "preview") return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-display text-xl">Preview</h3><p className="text-sm text-muted-foreground">First 10 of {parsed.length.toLocaleString("en-IN")} rows · <span className={invalid ? "text-status-red font-medium" : "text-status-green font-medium"}>{invalid ? `${invalid} row${invalid === 1 ? "" : "s"} with errors (will be skipped)` : "No errors found"}</span></p></div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /> Update existing products by SKU</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={createCats} onChange={(e) => setCreateCats(e.target.checked)} /> Create missing categories</label>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-2">Row</th><th className="p-2">Type</th><th className="p-2">SKU</th><th className="p-2">Name</th><th className="p-2">Price</th><th className="p-2">Category / Parent</th><th className="p-2">Size / Color</th><th className="p-2">Stock</th><th className="p-2">Issues</th></tr></thead>
          <tbody>
            {parsed.slice(0, 10).map((r) => {
              const has = (k: string) => r.errors.some((e) => e.toLowerCase().includes(k));
              const bad = "bg-status-red/10 text-status-red font-medium";
              return (
                <tr key={r.line} className={`border-t border-border/60 ${r.errors.length ? "bg-status-red/5" : ""}`}>
                  <td className="p-2 text-muted-foreground">{r.line}</td>
                  <td className="p-2">{r.type}</td>
                  <td className={`p-2 ${has("sku") ? bad : ""}`}>{r.sku || "—"}</td>
                  <td className={`p-2 ${has("name") ? bad : ""}`}>{r.name || (r.type === "variation" ? <span className="text-muted-foreground">(variation)</span> : "—")}</td>
                  <td className={`p-2 tabular-nums ${has("price") ? bad : ""}`}>{r.regular_price === null ? "—" : Number.isNaN(r.regular_price) ? "invalid" : `₹${r.regular_price.toLocaleString("en-IN")}`}{r.sale_price ? <span className="text-muted-foreground"> / ₹{r.sale_price.toLocaleString("en-IN")}</span> : null}</td>
                  <td className={`p-2 ${has("category") || has("parent") ? bad : ""}`}>{r.type === "variation" ? `↳ ${r.parent || "—"}` : r.category ?? "—"}</td>
                  <td className="p-2">{[r.size, r.color].filter(Boolean).join(" / ") || "—"}</td>
                  <td className={`p-2 tabular-nums ${has("stock") ? bad : ""}`}>{r.stock ?? "—"}</td>
                  <td className="p-2 text-xs">{r.errors.length ? <span className="text-status-red">{r.errors.join("; ")}</span> : <CheckCircle2 className="h-4 w-4 text-status-green" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2"><button className={btnGhost} onClick={() => setStep("map")}><ArrowLeft className="h-4 w-4" /> Back to mapping</button>
        <Button disabled={!parsed.length || invalid === parsed.length || catsQuery.isFetching || existingQuery.isFetching || !!catsQuery.error || !!existingQuery.error} onClick={runImport}>Import {(parsed.length - invalid).toLocaleString("en-IN")} rows</Button></div>
      {(catsQuery.error || existingQuery.error) && <p role="alert" className="text-status-red">Catalog data could not load. Refresh before importing.</p>}
    </Card>
  );

  if (step === "running") return (
    <Card className="p-8 text-center space-y-4">
      <Loader2 className="h-8 w-8 mx-auto animate-spin text-admin-nav" />
      <div className="font-display text-xl">Importing products…</div>
      <Progress value={progress} className="max-w-md mx-auto" />
      <p className="text-sm text-muted-foreground">{progress}% · Please keep this page open.</p>
    </Card>
  );

  return (
    <Card className="p-8 space-y-5">
      <div className="text-center"><CheckCircle2 className="h-10 w-10 mx-auto text-status-green" /><div className="font-display text-2xl mt-2">Import finished</div></div>
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center">
        <div className="rounded-lg bg-status-green/10 p-3"><div className="text-2xl font-semibold text-status-green">{result?.created}</div><div className="text-xs">Created</div></div>
        <div className="rounded-lg bg-status-blue/10 p-3"><div className="text-2xl font-semibold text-status-blue">{result?.updated}</div><div className="text-xs">Updated</div></div>
        <div className="rounded-lg bg-status-red/10 p-3"><div className="text-2xl font-semibold text-status-red">{result?.failed}</div><div className="text-xs">Failed</div></div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {!!result?.errors.length && <button className={btnGhost} onClick={() => download(`import-errors-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, new Blob(["\uFEFF" + Papa.unparse(result.errors.map((e) => ({ Row: e.line, SKU: e.sku, Error: e.error })))], { type: "text/csv" }))}><AlertCircle className="h-4 w-4" /> Download error report</button>}
        <button className={btnPrimary} onClick={reset}>Import another file</button>
      </div>
    </Card>
  );
}

// ---------------- EXPORT ----------------
function ExportTab() {
  const { data: cats = [] } = useQuery({ queryKey: ["bulk-cats"], queryFn: async () => (await supabase.from("categories").select("id, name, slug").order("sort_order")).data ?? [] });
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("all");
  const [cols, setCols] = useState<Set<ExportColumn>>(new Set(EXPORT_COLUMNS));
  const [fmt, setFmt] = useState<"csv" | "xlsx">("csv");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      let q = supabase.from("products").select("id, sku, name, is_published, featured, short_description, description, stock, original_price, price, images, product_type, weight, length_cm, width_cm, height_cm, sizes, colors, status, categories(name), product_variants(sku, size, color, stock, price, sale_price, image_url, status)").is("deleted_at", null).order("name");
      if (cat) q = q.eq("category_id", cat);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) { toast.info("No products match these filters"); return; }
      const rows = buildExportRows(data.map((p: any) => ({ ...p, category: p.categories?.name ?? null, images: p.images ?? [], sizes: p.sizes ?? [], colors: p.colors ?? [], variants: p.product_variants ?? [] })));
      const chosen = EXPORT_COLUMNS.filter((c) => cols.has(c));
      const stamp = format(new Date(), "yyyy-MM-dd");
      if (fmt === "csv") {
        download(`ihs-products-${stamp}.csv`, new Blob(["\uFEFF" + Papa.unparse({ fields: [...chosen], data: rows.map((r) => chosen.map((c) => r[c])) })], { type: "text/csv;charset=utf-8" }));
      } else {
        const { default: writeXlsxFile } = await import("write-excel-file/browser");
        const sheet = [chosen.map((c) => ({ value: c, fontWeight: "bold" as const })), ...rows.map((r) => chosen.map((c) => ({ value: r[c] === "" ? null : r[c] })))];
        download(`ihs-products-${stamp}.xlsx`, await writeXlsxFile(sheet as any).toBlob());
      }
      toast.success(`Exported ${data.length} products (${rows.length} rows incl. variations)`);
    } catch (e: any) { toast.error(e.message ?? "Export failed"); } finally { setBusy(false); }
  }
  const toggle = (c: ExportColumn) => setCols((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); if (!n.has("SKU")) n.add("SKU"); return n; });

  return (
    <Card className="p-6 space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm"><span className="block font-medium mb-1.5">Category</span><select className={`${inputCls} w-full`} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm"><span className="block font-medium mb-1.5">Status</span><select className={`${inputCls} w-full`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="inactive">Inactive</option><option value="rejected">Rejected</option></select></label>
        <div className="text-sm"><span className="block font-medium mb-1.5">Format</span><div className="flex gap-2">{(["csv", "xlsx"] as const).map((f) => <button key={f} onClick={() => setFmt(f)} className={`h-10 px-4 rounded-lg border text-sm ${fmt === f ? "bg-admin-nav text-admin-nav-foreground border-admin-nav" : "border-border bg-card"}`}>{f === "csv" ? "CSV" : "Excel (.xlsx)"}</button>)}</div></div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Columns ({cols.size})</span><div className="flex gap-3 text-xs"><button className="underline" onClick={() => setCols(new Set(EXPORT_COLUMNS))}>Select all</button><button className="underline" onClick={() => setCols(new Set(["SKU"]))}>Clear</button></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {EXPORT_COLUMNS.map((c) => <label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cols.has(c)} disabled={c === "SKU"} onChange={() => toggle(c)} />{c}</label>)}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Variable products are followed by one “variation” row per size/colour, linked by the Parent column — the same layout WooCommerce uses.</p>
      <button className={btnPrimary} disabled={busy} onClick={run}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export Products</button>
    </Card>
  );
}

// ---------------- HISTORY ----------------
function ImportHistory() {
  const { data = [], isLoading } = useQuery({ queryKey: ["import-history"], queryFn: async () => (await supabase.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(25)).data ?? [] });
  const tone = (s: string) => (s === "completed" ? "green" : s === "partial" ? "orange" : s === "failed" ? "red" : "blue") as "green" | "orange" | "red" | "blue";
  return (
    <Card className="mt-6 overflow-x-auto">
      <div className="p-4 font-display text-lg">Import History</div>
      <table className="w-full text-sm min-w-[720px]">
        <thead className="text-left text-xs text-muted-foreground bg-secondary/40"><tr><th className="p-3">Date</th><th className="p-3">File</th><th className="p-3">User</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Updated</th><th className="p-3">Failed</th><th className="p-3" /></tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={8} className="p-4 text-muted-foreground">Loading…</td></tr>}
          {!isLoading && data.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No imports yet.</td></tr>}
          {data.map((j: any) => (
            <tr key={j.id} className="border-t border-border/60">
              <td className="p-3 whitespace-nowrap">{format(new Date(j.created_at), "d MMM yyyy, HH:mm")}</td>
              <td className="p-3 max-w-[220px] truncate">{j.file_name}</td>
              <td className="p-3 text-muted-foreground">{j.user_email ?? "—"}</td>
              <td className="p-3"><Chip tone={tone(j.status)}>{j.status === "running" ? "Running / interrupted" : j.status[0].toUpperCase() + j.status.slice(1)}</Chip></td>
              <td className="p-3 tabular-nums">{j.created_count}</td><td className="p-3 tabular-nums">{j.updated_count}</td><td className="p-3 tabular-nums">{j.failed_count}</td>
              <td className="p-3 text-right">{Array.isArray(j.errors) && j.errors.length > 0 && <button className="text-xs underline" onClick={() => download(`import-errors-${j.id.slice(0, 6)}.csv`, new Blob(["\uFEFF" + Papa.unparse(j.errors.map((e: any) => ({ Row: e.line, SKU: e.sku, Error: e.error })))], { type: "text/csv" }))}>Error report</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
