import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Wand2, ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, inputCls, btnGhost } from "@/components/admin/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export type Variation = { size: string; color: string | null; sku: string; price: string; sale_price: string; stock: string; image_url: string; status: "active" | "inactive" };

const COLOR_CODES: Record<string, string> = { black: "BLK", white: "WHT", pink: "PNK", maroon: "MRN", peach: "PCH", grey: "GRY", gray: "GRY", "navy blue": "NVY", red: "RED", blue: "BLU", green: "GRN", yellow: "YLW", beige: "BEG", cream: "CRM", ivory: "IVR" };
export function colorCode(c: string) {
  const k = c.toLowerCase().trim();
  if (COLOR_CODES[k]) return COLOR_CODES[k];
  const words = k.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 3).padEnd(3, "X");
  return (k[0] + k.slice(1).replace(/[aeiou\W]/g, "")).toUpperCase().slice(0, 3).padEnd(3, "X");
}
export const sizeCode = (s: string) => (/free/i.test(s) ? "FS" : /one size/i.test(s) ? "OS" : s.toUpperCase().replace(/[^A-Z0-9]/g, ""));
export const variationSku = (base: string, size: string, color: string | null) => [base, color ? colorCode(color) : null, sizeCode(size)].filter(Boolean).join("-");
export function variationState(v: Pick<Variation, "stock" | "status">, reorder: number) {
  if (v.status === "inactive") return { label: "Inactive", tone: "blue" as const };
  const s = Number(v.stock) || 0;
  if (s <= 0) return { label: "Out of Stock", tone: "red" as const };
  if (s <= reorder) return { label: "Low Stock", tone: "orange" as const };
  return { label: "In Stock", tone: "green" as const };
}

type Props = {
  variations: Variation[]; onChange: (v: Variation[]) => void;
  sizes: string[]; colors: string[]; baseSku: string; reorder: number; regularPrice: string; salePrice: string;
  defaultSize: string; defaultColor: string; onDefaults: (size: string, color: string) => void; error?: string;
};

export function VariationsSection({ variations, onChange, sizes, colors, baseSku, reorder, regularPrice, salePrice, defaultSize, defaultColor, onDefaults, error }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadIdx = useRef<number>(-1);
  const key = (s: string, c: string | null) => `${s.toLowerCase()}|${(c ?? "").toLowerCase()}`;
  const dupSkus = (() => { const seen = new Map<string, number>(); variations.forEach((v) => v.sku && seen.set(v.sku.toUpperCase(), (seen.get(v.sku.toUpperCase()) ?? 0) + 1)); return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k)); })();
  const dupCombos = (() => { const seen = new Map<string, number>(); variations.forEach((v) => seen.set(key(v.size, v.color), (seen.get(key(v.size, v.color)) ?? 0) + 1)); return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k)); })();
  const update = (i: number, patch: Partial<Variation>) => onChange(variations.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function generate() {
    if (!sizes.length && !colors.length) return toast.error("On the attributes above, tick “Used for variations” for Size and/or Color and pick values first");
    const existing = new Set(variations.map((v) => key(v.size, v.color)));
    const added: Variation[] = [];
    (sizes.length ? sizes : ["One Size"]).forEach((s) => (colors.length ? colors : [null]).forEach((c) => {
      if (existing.has(key(s, c))) return;
      existing.add(key(s, c));
      added.push({ size: s, color: c, sku: variationSku(baseSku, s, c), price: "", sale_price: "", stock: "0", image_url: "", status: "active" });
    }));
    const skipped = (sizes.length || 1) * (colors.length || 1) - added.length;
    if (!added.length) return toast.info("All combinations already exist");
    onChange([...variations, ...added]);
    toast.success(`Added ${added.length} variation${added.length === 1 ? "" : "s"}${skipped ? ` · skipped ${skipped} existing` : ""}`);
  }
  function addOne() {
    const s = sizes.find((x) => !variations.some((v) => key(v.size, v.color) === key(x, colors[0] ?? null))) ?? sizes[0] ?? "One Size";
    const c = colors[0] ?? null;
    onChange([...variations, { size: s, color: c, sku: variationSku(baseSku, s, c), price: "", sale_price: "", stock: "0", image_url: "", status: "active" }]);
  }
  function bulk(action: "price" | "sale" | "stock" | "active" | "inactive" | "delete") {
    if (!selected.size) return toast.error("Select variations first");
    if (action === "delete") { if (!confirm(`Delete ${selected.size} variation(s)?`)) return; onChange(variations.filter((_, i) => !selected.has(i))); setSelected(new Set()); return; }
    if (action === "active" || action === "inactive") { onChange(variations.map((v, i) => (selected.has(i) ? { ...v, status: action } : v))); return; }
    const label = action === "price" ? "price (₹)" : action === "sale" ? "sale price (₹, blank to clear)" : "stock quantity";
    const val = prompt(`Set ${label} for ${selected.size} variation(s):`);
    if (val === null) return;
    const clean = val.trim();
    if (action === "stock" ? !/^\d{1,6}$/.test(clean) : !(clean === "" && action === "sale") && !(/^\d+(\.\d{1,2})?$/.test(clean) && Number(clean) <= 10000000)) return toast.error("Enter a valid number");
    const field = action === "price" ? "price" : action === "sale" ? "sale_price" : "stock";
    onChange(variations.map((v, i) => (selected.has(i) ? { ...v, [field]: clean } : v)));
  }
  async function upload(file: File) {
    const i = uploadIdx.current;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(i);
    const path = `variations/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000", contentType: file.type });
    setUploading(null);
    if (error) return toast.error(error.message);
    update(i, { image_url: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl });
  }

  const total = variations.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const allSel = variations.length > 0 && selected.size === variations.length;
  const sizeOpts = [...new Set([...sizes, ...variations.map((v) => v.size)])];
  const colorOpts = [...new Set([...colors, ...variations.map((v) => v.color).filter(Boolean) as string[]])];

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-display text-lg">Product Variations</h3><p className="text-xs text-muted-foreground">Total stock: <b className="text-foreground">{total}</b> (sum of all variations)</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={addOne}><Plus className="h-4 w-4" /> Add Variation</button>
          <button type="button" className={btnGhost} onClick={generate}><Wand2 className="h-4 w-4" /> Generate Variations</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button type="button" className={btnGhost}>Bulk Actions{selected.size ? ` (${selected.size})` : ""} <ChevronDown className="h-4 w-4" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => bulk("price")}>Set price</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulk("sale")}>Set sale price</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulk("stock")}>Set stock</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulk("active")}>Set status: Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulk("inactive")}>Set status: Inactive</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-status-red" onClick={() => bulk("delete")}>Delete selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 rounded-lg bg-secondary/40 p-3">
        <div className="sm:col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Default Form Values</div>
        <label className="text-sm"><span className="block mb-1">Default Size</span>
          <select className={`${inputCls} w-full`} value={defaultSize} onChange={(e) => onDefaults(e.target.value, defaultColor)}><option value="">No default</option>{sizeOpts.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm"><span className="block mb-1">Default Color</span>
          <select className={`${inputCls} w-full`} value={defaultColor} onChange={(e) => onDefaults(defaultSize, e.target.value)}><option value="">No default</option>{colorOpts.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>

      {error && <p className="text-xs text-status-red">{error}</p>}
      {(dupSkus.size > 0 || dupCombos.size > 0) && <p className="text-xs text-status-red">{dupCombos.size > 0 && "Some size/colour combinations are repeated. "}{dupSkus.size > 0 && "Some SKUs are repeated — each SKU must be unique."}</p>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      {variations.length === 0 ? <p className="text-sm text-muted-foreground">No variations yet. Pick Size and Color values above with “Used for variations” ticked, then click Generate Variations.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-xs text-muted-foreground text-left bg-secondary/40"><tr>
              <th className="p-2 w-8"><input type="checkbox" aria-label="Select all" checked={allSel} onChange={() => setSelected(allSel ? new Set() : new Set(variations.map((_, i) => i)))} /></th>
              <th className="p-2">Image</th><th className="p-2">SKU</th><th className="p-2">Size</th><th className="p-2">Color</th><th className="p-2">Price ₹</th><th className="p-2">Sale ₹</th><th className="p-2">Stock</th><th className="p-2">Status</th><th />
            </tr></thead>
            <tbody>
              {variations.map((v, i) => {
                const st = variationState(v, reorder);
                const isDupSku = !!v.sku && dupSkus.has(v.sku.toUpperCase());
                const isDupCombo = dupCombos.has(key(v.size, v.color));
                const low = (Number(v.stock) || 0) <= reorder;
                return (
                  <tr key={i} className={`border-t border-border/60 ${selected.has(i) ? "bg-secondary/30" : ""}`}>
                    <td className="p-2"><input type="checkbox" aria-label="Select variation" checked={selected.has(i)} onChange={() => setSelected((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} /></td>
                    <td className="p-2">
                      <div className="relative h-10 w-10">
                        <button type="button" aria-label="Upload variation image" onClick={() => { uploadIdx.current = i; fileRef.current?.click(); }} className="h-10 w-10 rounded-md bg-secondary overflow-hidden grid place-items-center border border-border">
                          {uploading === i ? <Loader2 className="h-4 w-4 animate-spin" /> : v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {v.image_url && <button type="button" aria-label="Remove image" onClick={() => update(i, { image_url: "" })} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-card border border-border grid place-items-center"><X className="h-3 w-3" /></button>}
                      </div>
                    </td>
                    <td className="p-2"><input className={`${inputCls} h-8 w-40 ${isDupSku ? "border-status-red" : ""}`} maxLength={60} value={v.sku} onChange={(e) => update(i, { sku: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} /></td>
                    <td className="p-2"><input list="var-sizes" className={`${inputCls} h-8 w-24 ${isDupCombo ? "border-status-red" : ""}`} maxLength={30} value={v.size} onChange={(e) => update(i, { size: e.target.value })} /></td>
                    <td className="p-2"><input list="var-colors" className={`${inputCls} h-8 w-28 ${isDupCombo ? "border-status-red" : ""}`} maxLength={30} value={v.color ?? ""} onChange={(e) => update(i, { color: e.target.value || null })} /></td>
                    <td className="p-2"><input className={`${inputCls} h-8 w-24`} inputMode="decimal" value={v.price} placeholder={regularPrice} onChange={(e) => update(i, { price: e.target.value.replace(/[^\d.]/g, "") })} /></td>
                    <td className="p-2"><input className={`${inputCls} h-8 w-24`} inputMode="decimal" value={v.sale_price} placeholder={salePrice} onChange={(e) => update(i, { sale_price: e.target.value.replace(/[^\d.]/g, "") })} /></td>
                    <td className="p-2"><input className={`${inputCls} h-8 w-20 ${low ? "text-status-red font-semibold" : ""}`} inputMode="numeric" value={v.stock} onChange={(e) => update(i, { stock: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></td>
                    <td className="p-2"><button type="button" title="Click to toggle Active/Inactive" onClick={() => update(i, { status: v.status === "inactive" ? "active" : "inactive" })}><Chip tone={st.tone}>{st.label}</Chip></button></td>
                    <td className="p-2"><button type="button" aria-label="Remove variation" onClick={() => { onChange(variations.filter((_, j) => j !== i)); setSelected(new Set()); }} className="p-1.5 rounded hover:bg-secondary text-status-red"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="var-sizes">{sizeOpts.map((s) => <option key={s} value={s} />)}</datalist>
          <datalist id="var-colors">{colorOpts.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      )}
    </div>
  );
}
