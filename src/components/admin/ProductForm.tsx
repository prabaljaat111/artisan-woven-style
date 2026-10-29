import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Upload, Star, Trash2, Loader2, X, Search, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, Chip, inr, inputCls, btnGhost, btnPrimary, statusTone } from "@/components/admin/ui";
import { RichText, htmlToText } from "@/components/admin/RichText";

type AttrSel = { attribute_id: string; value_ids: string[]; used_for_variations: boolean };
import { VariationsSection, type Variation } from "@/components/admin/VariationsSection";

export type ProductFormState = {
  name: string; short_description: string; description: string; category_id: string; brand_id: string;
  product_type: "simple" | "variable"; regular_price: string; sale_price: string; sale_starts_at: string; sale_ends_at: string;
  sku: string; featured: boolean; on_sale: boolean; images: string[]; video_url: string;
  track_inventory: boolean; stock: string; reorder_level: string; allow_backorders: boolean; stock_status: string;
  weight: string; length_cm: string; width_cm: string; height_cm: string; shipping_class: string;
  upsell_ids: string[]; cross_sell_ids: string[]; product_attributes: AttrSel[];
  seo_title: string; meta_description: string; slug: string; purchase_note: string; menu_order: string; reviews_enabled: boolean;
  status: string; default_size: string; default_color: string;
};

const EMPTY: ProductFormState = {
  name: "", short_description: "", description: "", category_id: "", brand_id: "", product_type: "simple",
  regular_price: "", sale_price: "", sale_starts_at: "", sale_ends_at: "", sku: "", featured: false, on_sale: false, images: [], video_url: "",
  track_inventory: true, stock: "0", reorder_level: "5", allow_backorders: false, stock_status: "auto",
  weight: "", length_cm: "", width_cm: "", height_cm: "", shipping_class: "",
  upsell_ids: [], cross_sell_ids: [], product_attributes: [],
  seo_title: "", meta_description: "", slug: "", purchase_note: "", menu_order: "0", reviews_enabled: true, status: "draft",
  default_size: "", default_color: "",
};

const TABS = ["General", "Inventory", "Shipping", "Linked Products", "Attributes", "Advanced"] as const;
type Tab = (typeof TABS)[number];
const FIELD_TAB: Record<string, Tab> = { name: "General", short_description: "General", category_id: "General", regular_price: "General", sale_price: "General", sale_ends_at: "General", stock: "Inventory", reorder_level: "Inventory", slug: "Advanced", meta_description: "Advanced", seo_title: "Advanced", variations: "Attributes" };

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

const schema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(150, "Keep it under 150 characters"),
  short_description: z.string().refine((h) => htmlToText(h).length > 0, "Short description is required").refine((h) => htmlToText(h).length <= 500, "Keep it under 500 characters"),
  category_id: z.string().min(1, "Choose a category"),
  regular_price: z.string().refine((v) => Number(v) > 0, "Enter a regular price above ₹0"),
  sale_price: z.string().refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0), "Enter a valid sale price"),
  slug: z.string().regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and dashes only").max(80),
  stock: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, "Stock must be 0 or more"),
  reorder_level: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, "Must be 0 or more"),
  seo_title: z.string().max(70, "Keep SEO title under 70 characters"),
  meta_description: z.string().max(160, "Keep meta description under 160 characters"),
  sale_starts_at: z.string(), sale_ends_at: z.string(),
}).superRefine((d, ctx) => {
  if (d.sale_price && Number(d.sale_price) >= Number(d.regular_price)) ctx.addIssue({ code: "custom", path: ["sale_price"], message: "Sale price must be lower than regular price" });
  if (d.sale_starts_at && d.sale_ends_at && d.sale_ends_at <= d.sale_starts_at) ctx.addIssue({ code: "custom", path: ["sale_ends_at"], message: "End date must be after start date" });
});

export function fromRow(p: any): ProductFormState {
  const onSale = Number(p.original_price) > Number(p.price);
  return {
    ...EMPTY,
    name: p.name ?? "", short_description: p.short_description ?? "", description: p.description ?? "",
    category_id: p.category_id ?? "", brand_id: p.brand_id ?? "", product_type: p.product_type ?? "simple",
    regular_price: String(p.original_price ?? p.price ?? ""), sale_price: onSale ? String(p.price) : "",
    sale_starts_at: toLocalInput(p.sale_starts_at), sale_ends_at: toLocalInput(p.sale_ends_at),
    sku: p.sku ?? "", featured: !!p.featured, on_sale: !!p.on_sale || onSale, images: p.images ?? [], video_url: p.video_url ?? "",
    track_inventory: p.track_inventory ?? true, stock: String(p.stock ?? 0), reorder_level: String(p.reorder_level ?? 5),
    allow_backorders: !!p.allow_backorders, stock_status: p.stock_status ?? "auto",
    weight: p.weight?.toString() ?? "", length_cm: p.length_cm?.toString() ?? "", width_cm: p.width_cm?.toString() ?? "", height_cm: p.height_cm?.toString() ?? "",
    shipping_class: p.shipping_class ?? "", upsell_ids: p.upsell_ids ?? [], cross_sell_ids: p.cross_sell_ids ?? [],
    product_attributes: Array.isArray(p.product_attributes) ? p.product_attributes : [],
    seo_title: p.seo_title ?? "", meta_description: p.meta_description ?? "", slug: p.slug ?? "", purchase_note: p.purchase_note ?? "",
    menu_order: String(p.menu_order ?? 0), reviews_enabled: p.reviews_enabled ?? true, status: p.status ?? "draft",
    default_size: p.default_size ?? "", default_color: p.default_color ?? "",
  };
}

export function ProductForm({ productId, initial, initialVariations = [], rejectionReason }: { productId?: string; initial?: ProductFormState; initialVariations?: Variation[]; rejectionReason?: string | null }) {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const canPublish = role === "admin" || role === "manager";
  const [form, setForm] = useState<ProductFormState>(initial ?? EMPTY);
  const [variations, setVariations] = useState<Variation[]>(initialVariations);
  const [tab, setTab] = useState<Tab>("General");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  const [cats, setCats] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [attrs, setAttrs] = useState<{ id: string; name: string; slug: string; attribute_values: { id: string; name: string; color_hex: string | null; sort_order: number }[] }[]>([]);
  useEffect(() => {
    supabase.from("categories").select("id, name, slug").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("brands").select("id, name").order("name").then(({ data }) => setBrands(data ?? []));
    supabase.from("attributes").select("id, name, slug, attribute_values(id, name, color_hex, sort_order)").order("name").then(({ data }) => setAttrs((data as any) ?? []));
  }, []);

  useBlocker({
    shouldBlockFn: () => dirtyRef.current && !window.confirm("You have unsaved changes. Leave without saving?"),
    enableBeforeUnload: dirty,
  });

  function set<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key as string]) setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
    dirtyRef.current = true; setDirty(true);
  }

  const err = (k: string) => errors[k] ? <p className="text-xs text-status-red mt-1">{errors[k]}</p> : null;

  const variationAttrs = useMemo(() => {
    const pick = (slug: string) => {
      const a = attrs.find((x) => x.slug === slug);
      const sel = form.product_attributes.find((s) => s.attribute_id === a?.id && s.used_for_variations);
      return a && sel ? a.attribute_values.filter((v) => sel.value_ids.includes(v.id)).sort((x, y) => x.sort_order - y.sort_order).map((v) => v.name) : [];
    };
    return { sizes: pick("size"), colors: pick("color") };
  }, [attrs, form.product_attributes]);

  const baseSku = useMemo(() => {
    if (form.sku.trim()) return form.sku.trim().toUpperCase();
    const c = cats.find((x) => x.id === form.category_id);
    const code = (c?.slug.split("-")[0] ?? "GEN").toUpperCase().replace(/S$/, "");
    return `IHS-${code}`;
  }, [form.sku, form.category_id, cats]);

  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const savingRef = useRef(false);
  async function save(mode: "draft" | "review" | "publish", silent = false) {
    if (savingRef.current) return;
    try { return await doSave(mode, silent); } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); } finally { savingRef.current = false; setSaving(null); }
  }
  async function doSave(mode: "draft" | "review" | "publish", silent: boolean) {
    const parsed = schema.safeParse(form);
    const e: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach((i) => { const k = String(i.path[0]); if (!e[k]) e[k] = i.message; });
    if (form.product_type === "variable") {
      if (variations.length === 0) e.variations = "Generate at least one variation";
      else {
        const combos = new Set<string>(), skus = new Set<string>();
        for (const v of variations) {
          const ck = `${v.size.trim().toLowerCase()}|${(v.color ?? "").trim().toLowerCase()}`;
          if (!v.size.trim()) { e.variations = "Every variation needs a size"; break; }
          if (combos.has(ck)) { e.variations = `Duplicate variation: ${v.size}${v.color ? " / " + v.color : ""}`; break; }
          combos.add(ck);
          if (v.sku) { if (skus.has(v.sku)) { e.variations = `Duplicate SKU: ${v.sku}`; break; } skus.add(v.sku); }
          if (v.sale_price && v.price && Number(v.sale_price) >= Number(v.price)) { e.variations = `Sale price must be below price (${v.sku || v.size})`; break; }
        }
        if (!e.variations && skus.size) {
          const { data: clash } = await supabase.from("product_variants").select("sku, product_id").in("sku", [...skus]);
          const other = (clash ?? []).find((c) => c.product_id !== productId);
          if (other) e.variations = `SKU ${other.sku} is already used by another product`;
        }
      }
    }
    if (Object.keys(e).length) {
      if (silent) return; // auto-save waits until required fields are valid
      setErrors(e);
      setTab(FIELD_TAB[Object.keys(e)[0]] ?? "General");
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (form.video_url && !/^https:\/\//i.test(form.video_url)) { toast.error("Use a secure HTTPS video file link"); return; }
    savingRef.current = true;
    setSaving(mode);
    const cat = cats.find((c) => c.id === form.category_id);
    const sku = form.sku.trim() || `IHS-${(cat?.slug ?? "GEN").slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const slug = form.slug || slugify(form.name);
    const regular = Number(form.regular_price);
    const sale = form.sale_price ? Number(form.sale_price) : null;
    const sizeAttr = attrs.find((a) => a.slug === "size");
    const colorAttr = attrs.find((a) => a.slug === "color");
    const namesFor = (a?: (typeof attrs)[number]) => {
      const sel = form.product_attributes.find((s) => s.attribute_id === a?.id);
      return a && sel ? a.attribute_values.filter((v) => sel.value_ids.includes(v.id)).map((v) => v.name) : [];
    };
    const sizes = namesFor(sizeAttr), colors = namesFor(colorAttr);
    const status = mode === "publish" ? "active" : mode === "review" ? "pending_review" : "draft";

    const payload: Record<string, unknown> = {
      name: form.name.trim(), slug, sku,
      short_description: form.short_description, description: form.description || form.short_description,
      category_id: form.category_id, brand_id: form.brand_id || null, product_type: form.product_type,
      original_price: regular, price: sale ?? regular, on_sale: form.on_sale || sale !== null,
      sale_starts_at: form.sale_starts_at ? new Date(form.sale_starts_at).toISOString() : null,
      sale_ends_at: form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
      featured: form.featured, images: form.images, video_url: form.video_url || null,
      track_inventory: form.track_inventory, reorder_level: Number(form.reorder_level), low_stock_threshold: Number(form.reorder_level),
      allow_backorders: form.allow_backorders, stock_status: form.stock_status,
      weight: num(form.weight), length_cm: num(form.length_cm), width_cm: num(form.width_cm), height_cm: num(form.height_cm),
      dimensions: [form.length_cm, form.width_cm, form.height_cm].every(Boolean) ? `${form.length_cm}×${form.width_cm}×${form.height_cm} cm` : null,
      shipping_class: form.shipping_class || null,
      upsell_ids: form.upsell_ids, cross_sell_ids: form.cross_sell_ids, product_attributes: form.product_attributes,
      seo_title: form.seo_title || null, meta_description: form.meta_description || null, purchase_note: form.purchase_note || null,
      menu_order: Number(form.menu_order) || 0, reviews_enabled: form.reviews_enabled,
      default_size: form.product_type === "variable" ? form.default_size || null : null,
      default_color: form.product_type === "variable" ? form.default_color || null : null,
      status, is_published: mode === "publish",
      ...(sizes.length ? { sizes } : {}), ...(colors.length ? { colors, color: colors[0] } : {}),
      ...(mode === "publish" ? { rejection_reason: null } : {}),
    };
    if (form.product_type === "simple") payload.stock = Number(form.stock);
    if (!productId) payload.submitted_by = user?.id;

    const res = await supabase.rpc("save_product_form", {
      _id: productId ?? null,
      _product: payload as any,
      _variations: variations.map((v) => ({ size: v.size.trim(), color: v.color?.trim() || null, sku: v.sku.trim().toUpperCase() || null, status: v.status, price: num(v.price), sale_price: num(v.sale_price), stock: Number(v.stock), image_url: v.image_url || null })) as any,
    } as any); // PostgreSQL accepts null for a new product; generated RPC types omit nullable arguments.
    if (res.error) throw new Error(res.error.message);
    const saved = res.data as { id?: string; status?: string } | null;
    if (!saved?.id) throw new Error("Save did not return a product");
    const id = saved.id;
    setForm((f) => ({ ...f, status: saved.status ?? status, sku, slug }));

    setSaving(null);
    dirtyRef.current = false; setDirty(false);
    const finalStatus = saved.status;
    if (silent) setAutoSavedAt(new Date());
    else toast.success(finalStatus === "active" ? "Published" : finalStatus === "pending_review" ? "Submitted for review" : "Draft saved");
    if (!productId) navigate({ to: "/admin/products/$id", params: { id }, replace: silent });
  }

  // Auto-save drafts every 30s while there are unsaved changes (only for new products or ones still in Draft).
  const autoEnabled = !productId || form.status === "draft";
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!autoEnabled) return;
    const t = setInterval(() => { if (dirtyRef.current && !savingRef.current) saveRef.current("draft", true); }, 30000);
    return () => clearInterval(t);
  }, [autoEnabled]);

  return (
    <div className="pb-28">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Link to="/admin/products" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card" aria-label="Back to products"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-admin-nav">{productId ? "Edit Product" : "Add New Product"}</h1>
          {productId && <div className="mt-1 flex items-center gap-2 text-sm"><Chip tone={statusTone(form.status)}>{form.status.replace("_", " ")}</Chip>{dirty && <span className="text-status-orange text-xs">Unsaved changes</span>}</div>}
        </div>
      </div>
      {rejectionReason && form.status === "rejected" && <Card className="p-3 mb-4 border-status-red/30 bg-status-red/5 text-sm text-status-red">Rejected: {rejectionReason}</Card>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <Card>
          <div className="flex overflow-x-auto border-b border-border">
            {TABS.map((t) => {
              const hasErr = Object.keys(errors).some((k) => FIELD_TAB[k] === t);
              return (
                <button key={t} type="button" onClick={() => setTab(t)} className={`relative shrink-0 px-4 py-3 text-sm ${tab === t ? "text-admin-nav font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-admin-nav" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}{hasErr && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-status-red align-middle" />}
                </button>
              );
            })}
          </div>
          <div className="p-5 space-y-4">
            {tab === "General" && (
              <>
                <Field label="Product Name" required>
                  <input className={fieldCls(errors.name)} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Chikankari Kurti with Palazzo Set" maxLength={150} />{err("name")}
                </Field>
                <Field label="Short Description" required>
                  <RichText value={form.short_description} onChange={(h) => set("short_description", h)} placeholder="2–3 lines shown near the price" minHeight={90} invalid={!!errors.short_description} />{err("short_description")}
                </Field>
                <Field label="Description">
                  <RichText value={form.description} onChange={(h) => set("description", h)} placeholder="Fabric, embroidery, fit, styling tips…" minHeight={180} />
                </Field>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Category" required>
                    <select className={fieldCls(errors.category_id)} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                      <option value="">Select category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>{err("category_id")}
                  </Field>
                  <Field label="Brand">
                    <select className={fieldCls()} value={form.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
                      <option value="">No brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Product Type">
                    <select className={fieldCls()} value={form.product_type} onChange={(e) => set("product_type", e.target.value as any)}>
                      <option value="simple">Simple product</option><option value="variable">Variable product</option>
                    </select>
                  </Field>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Regular Price (₹)" required>
                    <input inputMode="decimal" className={fieldCls(errors.regular_price)} value={form.regular_price} onChange={(e) => set("regular_price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="2499" />{err("regular_price")}
                  </Field>
                  <Field label="Sale Price (₹)">
                    <input inputMode="decimal" className={fieldCls(errors.sale_price)} value={form.sale_price} onChange={(e) => set("sale_price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="1999" />{err("sale_price")}
                  </Field>
                  <Field label="SKU">
                    <input className={fieldCls()} value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="Auto-generated if empty" maxLength={40} />
                  </Field>
                </div>
                {form.sale_price && (
                  <div className="grid sm:grid-cols-2 gap-4 p-3 rounded-lg bg-secondary/40">
                    <Field label="Sale starts (optional)"><input type="datetime-local" className={fieldCls()} value={form.sale_starts_at} onChange={(e) => set("sale_starts_at", e.target.value)} /></Field>
                    <Field label="Sale ends (optional)"><input type="datetime-local" className={fieldCls(errors.sale_ends_at)} value={form.sale_ends_at} onChange={(e) => set("sale_ends_at", e.target.value)} />{err("sale_ends_at")}</Field>
                    {Number(form.regular_price) > 0 && <div className="sm:col-span-2 text-xs text-muted-foreground">Customers see <b className="text-foreground">{inr(form.sale_price)}</b> <s>{inr(form.regular_price)}</s> · {Math.round((1 - Number(form.sale_price) / Number(form.regular_price)) * 100)}% off</div>}
                  </div>
                )}
                <div className="flex flex-wrap gap-5">
                  <Check label="Featured Product" checked={form.featured} onChange={(v) => set("featured", v)} />
                  <Check label="On Sale" checked={form.on_sale} onChange={(v) => set("on_sale", v)} />
                </div>
              </>
            )}

            {tab === "Inventory" && (
              <>
                <Check label="Manage stock" checked={form.track_inventory} onChange={(v) => set("track_inventory", v)} />
                {form.track_inventory && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Stock quantity">
                      {form.product_type === "variable"
                        ? <div className="text-sm text-muted-foreground py-2">Sum of variation stock ({variations.reduce((s, v) => s + (Number(v.stock) || 0), 0)})</div>
                        : <><input inputMode="numeric" className={fieldCls(errors.stock)} value={form.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />{err("stock")}</>}
                    </Field>
                    <Field label="Low stock threshold (reorder level)">
                      <input inputMode="numeric" className={fieldCls(errors.reorder_level)} value={form.reorder_level} onChange={(e) => set("reorder_level", e.target.value.replace(/\D/g, ""))} />{err("reorder_level")}
                    </Field>
                  </div>
                )}
                <Check label="Allow backorders" checked={form.allow_backorders} onChange={(v) => set("allow_backorders", v)} />
                <Field label="Stock status">
                  <select className={fieldCls()} value={form.stock_status} onChange={(e) => set("stock_status", e.target.value)}>
                    <option value="auto">Automatic (from stock quantity)</option><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="on_backorder">On backorder</option>
                  </select>
                </Field>
              </>
            )}

            {tab === "Shipping" && (
              <>
                <Field label="Weight (kg)"><input inputMode="decimal" className={fieldCls()} value={form.weight} onChange={(e) => set("weight", e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.4" /></Field>
                <Field label="Dimensions (cm)">
                  <div className="grid grid-cols-3 gap-2">
                    {(["length_cm", "width_cm", "height_cm"] as const).map((k, i) => <input key={k} inputMode="decimal" aria-label={["Length", "Width", "Height"][i]} className={fieldCls()} value={form[k]} onChange={(e) => set(k, e.target.value.replace(/[^\d.]/g, ""))} placeholder={["Length", "Width", "Height"][i]} />)}
                  </div>
                </Field>
                <Field label="Shipping class">
                  <select className={fieldCls()} value={form.shipping_class} onChange={(e) => set("shipping_class", e.target.value)}>
                    <option value="">Standard</option><option value="light">Light (under 500 g)</option><option value="heavy">Heavy / bulky</option><option value="express">Express only</option><option value="free">Free shipping</option>
                  </select>
                </Field>
              </>
            )}

            {tab === "Linked Products" && (
              <>
                <ProductPicker label="Upsells" hint="Shown on this product's page as “You may also like”." value={form.upsell_ids} onChange={(v) => set("upsell_ids", v)} excludeId={productId} />
                <ProductPicker label="Cross-sells" hint="Suggested in the cart alongside this product." value={form.cross_sell_ids} onChange={(v) => set("cross_sell_ids", v)} excludeId={productId} />
              </>
            )}

            {tab === "Attributes" && (
              <>
                {attrs.map((a) => {
                  const sel = form.product_attributes.find((s) => s.attribute_id === a.id);
                  const update = (patch: Partial<AttrSel> | null) => {
                    const rest = form.product_attributes.filter((s) => s.attribute_id !== a.id);
                    set("product_attributes", patch === null ? rest : [...rest, { attribute_id: a.id, value_ids: [], used_for_variations: false, ...sel, ...patch }]);
                  };
                  const canVary = a.slug === "size" || a.slug === "color";
                  return (
                    <div key={a.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Check label={a.name} checked={!!sel} onChange={(v) => update(v ? {} : null)} />
                        {sel && canVary && <Check label="Used for variations" checked={sel.used_for_variations} onChange={(v) => update({ used_for_variations: v })} />}
                      </div>
                      {sel && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[...a.attribute_values].sort((x, y) => x.sort_order - y.sort_order).map((v) => {
                            const on = sel.value_ids.includes(v.id);
                            return (
                              <button key={v.id} type="button" onClick={() => update({ value_ids: on ? sel.value_ids.filter((x) => x !== v.id) : [...sel.value_ids, v.id] })}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${on ? "bg-admin-nav text-admin-nav-foreground border-admin-nav" : "bg-card border-border"}`}>
                                {v.color_hex && <span className="h-3 w-3 rounded-full border border-border" style={{ background: v.color_hex }} />}{v.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {form.product_type === "variable" ? (
                  <VariationsSection
                    variations={variations} onChange={(v) => { setVariations(v); dirtyRef.current = true; setDirty(true); if (errors.variations) setErrors((e) => { const n = { ...e }; delete n.variations; return n; }); }}
                    sizes={variationAttrs.sizes} colors={variationAttrs.colors} baseSku={baseSku} reorder={Number(form.reorder_level) || 0}
                    regularPrice={form.regular_price} salePrice={form.sale_price}
                    defaultSize={form.default_size} defaultColor={form.default_color}
                    onDefaults={(s, c) => setForm((f) => { dirtyRef.current = true; setDirty(true); return { ...f, default_size: s, default_color: c }; })}
                    error={errors.variations}
                  />
                ) : <p className="text-xs text-muted-foreground">Switch Product Type to “Variable” on the General tab to set price and stock per size/colour.</p>}
              </>
            )}

            {tab === "Advanced" && (
              <>
                <Field label={`SEO title (${form.seo_title.length}/70)`}><input className={fieldCls(errors.seo_title)} value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder={form.name || "Defaults to product name"} />{err("seo_title")}</Field>
                <Field label={`Meta description (${form.meta_description.length}/160)`}><textarea rows={3} className={`${fieldCls(errors.meta_description)} h-auto py-2`} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} />{err("meta_description")}</Field>
                <Field label="URL slug">
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground whitespace-nowrap">/product/</span>
                    <input className={fieldCls(errors.slug)} value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }} />
                    {slugTouched && <button type="button" className="text-xs underline whitespace-nowrap" onClick={() => { setSlugTouched(false); set("slug", slugify(form.name)); }}>Reset</button>}
                  </div>{err("slug")}
                </Field>
                <Field label="Purchase note"><textarea rows={2} className={`${fieldCls()} h-auto py-2`} value={form.purchase_note} onChange={(e) => set("purchase_note", e.target.value)} placeholder="Shown to the customer after purchase" maxLength={500} /></Field>
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <Field label="Menu order"><input inputMode="numeric" className={fieldCls()} value={form.menu_order} onChange={(e) => set("menu_order", e.target.value.replace(/[^\d-]/g, ""))} /></Field>
                  <Check label="Enable reviews" checked={form.reviews_enabled} onChange={(v) => set("reviews_enabled", v)} />
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="space-y-4"><ImagesPanel images={form.images} onChange={(imgs) => set("images", imgs)} /><Card className="p-5 space-y-3"><h2 className="font-display text-xl">Product video</h2><input aria-label="Product video URL" type="url" value={form.video_url} onChange={e => set("video_url", e.target.value)} placeholder="https://…/product-video.mp4" className={`${inputCls} w-full`} />{form.video_url && <video src={form.video_url} controls playsInline preload="metadata" className="w-full aspect-[9/16] max-h-80 object-contain bg-secondary" />}</Card></div>
      </div>

      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-20 bg-card/95 backdrop-blur border-t border-border px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-2">
        {!canPublish && <span className="text-xs text-muted-foreground mr-auto">A manager will review your product before it goes live.</span>}
        {autoEnabled && <span className="text-xs text-muted-foreground self-center mr-auto">{autoSavedAt ? `Auto-saved at ${autoSavedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Drafts auto-save every 30 seconds"}</span>}
        <button type="button" disabled={!!saving} className={btnGhost} onClick={() => save("draft")}>{saving === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}Save Draft</button>
        <button type="button" disabled={!!saving} className={canPublish ? btnGhost : btnPrimary} onClick={() => save("review")}>{saving === "review" && <Loader2 className="h-4 w-4 animate-spin" />}Submit for Review</button>
        {canPublish && <button type="button" disabled={!!saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-status-green text-card text-sm font-medium hover:opacity-90 disabled:opacity-50" onClick={() => save("publish")}>{saving === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}Publish</button>}
      </div>
    </div>
  );
}

const fieldCls = (error?: string) => `${inputCls} w-full ${error ? "border-status-red" : ""}`;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium mb-1.5">{label}{required && <span className="text-status-red"> *</span>}</span>{children}</label>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" className="h-4 w-4 accent-[var(--admin-nav)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function ImagesPanel({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const main = images[Math.min(active, images.length - 1)];

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => {
      if (!TYPES.includes(f.type)) { toast.error(`${f.name}: use JPG, PNG, WEBP or AVIF`); return false; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name}: max 5 MB`); return false; }
      return true;
    });
    if (!list.length) return;
    setBusy({ done: 0, total: list.length });
    const urls: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${f.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f, { cacheControl: "31536000", contentType: f.type });
      if (error) toast.error(`${f.name}: ${error.message}`);
      else urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      setBusy({ done: i + 1, total: list.length });
    }
    setBusy(null);
    if (urls.length) { onChange([...images, ...urls]); toast.success(`${urls.length} image(s) uploaded`); }
  }

  const move = (from: number, to: number) => { const n = [...images]; const [x] = n.splice(from, 1); n.splice(to, 0, x); onChange(n); };
  const remove = (i: number) => { onChange(images.filter((_, j) => j !== i)); setActive(0); };

  return (
    <Card className="p-5 h-fit xl:sticky xl:top-20 space-y-4">
      <div className="flex items-center justify-between"><h2 className="font-display text-xl">Product Images</h2><span className="text-xs text-muted-foreground">{images.length} image{images.length === 1 ? "" : "s"}</span></div>
      <div
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); } }}
        className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary grid place-items-center border-2 border-dashed ${over ? "border-admin-nav" : "border-transparent"}`}
      >
        {main ? <img src={main} alt="Main product" className="h-full w-full object-cover" /> : <div className="text-center text-sm text-muted-foreground p-6"><Upload className="h-8 w-8 mx-auto mb-2" />Drop images here</div>}
        {main && active === 0 && <span className="absolute top-2 left-2"><Chip tone="green">Primary</Chip></span>}
        {busy && <div className="absolute inset-0 bg-card/70 grid place-items-center text-sm"><Loader2 className="h-6 w-6 animate-spin mb-1" />Uploading {busy.done}/{busy.total}</div>}
      </div>
      <input ref={fileRef} type="file" multiple accept={TYPES.join(",")} className="hidden" onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }} />
      <button type="button" className={`${btnPrimary} w-full justify-center`} disabled={!!busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload Images</button>

      {images.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Product Gallery <span className="text-xs text-muted-foreground font-normal">· drag to reorder, first is primary</span></div>
          <div className="grid grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div key={url} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { move(drag, i); setActive(i); } setDrag(null); }}
                className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-grab ${i === active ? "border-admin-nav" : "border-transparent"} ${drag === i ? "opacity-40" : ""}`}>
                <button type="button" onClick={() => setActive(i)} className="h-full w-full" aria-label={`Preview image ${i + 1}`}><img src={url} alt="" className="h-full w-full object-cover" /></button>
                <GripVertical className="absolute top-0.5 left-0.5 h-3.5 w-3.5 text-card drop-shadow" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-0.5 bg-foreground/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <button type="button" title="Set as primary" aria-label="Set as primary" disabled={i === 0} onClick={() => { move(i, 0); setActive(0); }} className="p-1 text-card disabled:opacity-40"><Star className="h-3.5 w-3.5" /></button>
                  <button type="button" title="Delete" aria-label="Delete image" onClick={() => remove(i)} className="p-1 text-card"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ProductPicker({ label, hint, value, onChange, excludeId }: { label: string; hint: string; value: string[]; onChange: (v: string[]) => void; excludeId?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; sku: string | null; images: string[] }[]>([]);
  const [chosen, setChosen] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!value.length) { setChosen([]); return; }
    supabase.from("products").select("id, name").in("id", value).then(({ data }) => setChosen(data ?? []));
  }, [value]);
  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, " ");
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("products").select("id, name, sku, images").is("deleted_at", null).or(`name.ilike.%${term}%,sku.ilike.%${term}%`).limit(8);
      setResults((data ?? []).filter((p) => p.id !== excludeId && !value.includes(p.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, value, excludeId]);

  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <p className="text-xs text-muted-foreground mb-2">{hint}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {chosen.map((c) => <span key={c.id} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-secondary text-sm">{c.name}<button type="button" aria-label={`Remove ${c.name}`} onClick={() => onChange(value.filter((v) => v !== c.id))} className="h-5 w-5 grid place-items-center rounded-full hover:bg-card"><X className="h-3 w-3" /></button></span>)}
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <input className={`${inputCls} w-full pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products by name or SKU" />
        {results.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-xl shadow-[var(--shadow-admin-card)] p-1">
            {results.map((r) => (
              <button key={r.id} type="button" onClick={() => { onChange([...value, r.id]); setQ(""); }} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-secondary text-left text-sm">
                <span className="h-9 w-7 rounded bg-secondary overflow-hidden shrink-0">{r.images?.[0] && <img src={r.images[0]} alt="" className="h-full w-full object-cover" />}</span>
                <span className="flex-1 truncate">{r.name}</span><span className="text-xs text-muted-foreground">{r.sku}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
