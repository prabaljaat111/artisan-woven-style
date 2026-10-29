import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Copy, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminPageMeta } from "@/lib/page-meta";
import { Card, PageHeader, btnPrimary, btnGhost, inputCls } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/media")({
  component: MediaPage,
  head: () => ({ meta: adminPageMeta("Media Library") }),
});

const BUCKET = "product-images";
type F = { path: string; name: string; size: number; created: string; url: string; mime: string };

async function listAll(prefix = "", depth = 0): Promise<F[]> {
  const out: F[] = [];
  for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  for (const e of data ?? []) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    if (!e.id) { if (depth < 3) out.push(...(await listAll(path, depth + 1))); continue; }
    if (e.name === ".emptyFolderPlaceholder") continue;
    out.push({ mime: (e.metadata as any)?.mimetype ?? "", path, name: e.name, size: (e.metadata as any)?.size ?? 0, created: e.created_at ?? "", url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
  }
  if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

function MediaPage() {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const q = useQuery({ queryKey: ["media"], queryFn: () => listAll() });
  const files = (q.data ?? []).filter((f) => f.path.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.created.localeCompare(a.created));

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    let ok = 0;
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) { toast.error(`${f.name}: only images or videos`); continue; }
      const path = `library/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, f, { cacheControl: "31536000", contentType: f.type });
      if (error) toast.error(`${f.name}: ${error.message}`); else ok++;
    }
    setBusy(false);
    if (ok) toast.success(`${ok} file(s) uploaded`);
    qc.invalidateQueries({ queryKey: ["media"] });
  };

  const remove = async (f: F) => {
    if (!confirm(`Delete ${f.name}? Products using this image will show a broken picture.`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([f.path]);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["media"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Media Library (${q.data?.length ?? 0})`} subtitle="All product photos and videos in one place."
        actions={<button className={btnPrimary} disabled={busy} onClick={() => input.current?.click()}><Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload"}</button>} />
      <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground ${drag ? "border-primary bg-secondary" : "border-border"}`}>
        Drag and drop images here, or click Upload
      </div>
      <div className="relative max-w-sm"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><input className={`${inputCls} w-full pl-9`} placeholder="Search files" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : !files.length ? <Card><p className="text-sm text-muted-foreground">No files yet.</p></Card> : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {files.map((f) => (
            <Card key={f.path} className="!p-2">
              <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                {(f.mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(f.name)) ? <video src={f.url} className="h-full w-full object-cover" muted controls preload="metadata" /> : <img src={f.url} alt={f.name} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <p className="text-xs mt-2 truncate" title={f.path}>{f.name}</p>
              <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
              <div className="flex gap-1 mt-2">
                <button className={`${btnGhost} flex-1 justify-center !h-8`} onClick={() => { navigator.clipboard.writeText(f.url).then(() => toast.success("Link copied")).catch(() => toast.error("Could not copy link")); }}><Copy className="h-3.5 w-3.5" />Copy</button>
                <button className={`${btnGhost} !h-8 text-destructive`} aria-label="Delete" onClick={() => remove(f)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
