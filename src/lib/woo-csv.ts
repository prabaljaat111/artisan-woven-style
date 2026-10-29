// WooCommerce-compatible CSV helpers: field mapping, row validation, and export row building.
// Pure functions only (no database access) so they can be unit-tested.

export type ImportField =
  | "type" | "sku" | "name" | "published" | "featured" | "short_description" | "description"
  | "regular_price" | "sale_price" | "categories" | "images" | "stock" | "parent"
  | "weight" | "length" | "width" | "height" | "id" | "size" | "color";

export const IMPORT_FIELDS: { key: ImportField; label: string; aliases: string[] }[] = [
  { key: "type", label: "Type", aliases: ["type", "product type"] },
  { key: "sku", label: "SKU", aliases: ["sku"] },
  { key: "name", label: "Name", aliases: ["name", "product name", "product_name", "title"] },
  { key: "published", label: "Published", aliases: ["published", "is_published", "status"] },
  { key: "featured", label: "Is featured?", aliases: ["is featured?", "featured"] },
  { key: "short_description", label: "Short description", aliases: ["short description", "short_description"] },
  { key: "description", label: "Description", aliases: ["description"] },
  { key: "regular_price", label: "Regular price", aliases: ["regular price", "regular_price", "original_price", "mrp", "price", "selling_price"] },
  { key: "sale_price", label: "Sale price", aliases: ["sale price", "sale_price"] },
  { key: "categories", label: "Categories", aliases: ["categories", "category", "category_name", "category_slug"] },
  { key: "images", label: "Images", aliases: ["images", "image", "image url", "image_url"] },
  { key: "stock", label: "Stock", aliases: ["stock", "stock quantity", "quantity", "qty"] },
  { key: "parent", label: "Parent", aliases: ["parent", "parent sku"] },
  { key: "weight", label: "Weight (kg)", aliases: ["weight (kg)", "weight"] },
  { key: "length", label: "Length (cm)", aliases: ["length (cm)", "length"] },
  { key: "width", label: "Width (cm)", aliases: ["width (cm)", "width"] },
  { key: "height", label: "Height (cm)", aliases: ["height (cm)", "height"] },
  { key: "id", label: "Original ID", aliases: ["id"] },
  { key: "size", label: "Size", aliases: ["size", "sizes"] },
  { key: "color", label: "Color", aliases: ["color", "colour", "colors"] },
];

export type Mapping = Partial<Record<ImportField, string>>;

export function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const norm = (s: string) => s.trim().toLowerCase();
  for (const f of IMPORT_FIELDS) {
    const h = f.aliases.map((alias) => headers.find((x) => alias === norm(x))).find(Boolean);
    if (h) m[f.key] = h;
  }
  return m;
}

export type ParsedRow = {
  line: number; // 1-based line in file incl. header => data row index + 2
  type: "simple" | "variable" | "variation";
  sku: string; name: string; published: boolean; featured: boolean;
  short_description: string; description: string;
  regular_price: number | null; sale_price: number | null;
  category: string | null; images: string[]; stock: number | null; parent: string;
  weight: number | null; length: number | null; width: number | null; height: number | null;
  size: string | null; color: string | null; attributes: { name: string; values: string[] }[];
  errors: string[];
};

const num = (v: string | undefined) => {
  const s = (v ?? "").toString().replace(/[₹,\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};
const truthy = (v: string | undefined) => ["1", "yes", "true", "publish", "published", "active"].includes((v ?? "").trim().toLowerCase());

/** Leaf category name from a WooCommerce categories cell like "Women > Kurtis, Sale". */
export function leafCategory(cell: string | undefined): string | null {
  const first = (cell ?? "").split(",")[0]?.trim();
  if (!first) return null;
  const parts = first.split(">").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function readAttributes(raw: Record<string, string>) {
  const normalized = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v]));
  const out: { name: string; values: string[] }[] = [];
  for (let i = 1; i <= 10; i++) {
    const name = normalized[`attribute ${i} name`]?.trim();
    const val = normalized[`attribute ${i} value(s)`] ?? normalized[`attribute ${i} value`];
    if (name) out.push({ name, values: (val ?? "").split(",").map((s) => s.trim()).filter(Boolean) });
  }
  return out;
}

export function parseRows(raw: Record<string, string>[], mapping: Mapping, opts: { knownCategories: string[]; createMissingCategories: boolean; existingSkus?: string[] }): ParsedRow[] {
  const get = (r: Record<string, string>, k: ImportField) => { const header = mapping[k]; return header ? (r[header] ?? "").toString().trim() : ""; };
  const originalIds = new Map(raw.map((r) => [get(r, "id"), get(r, "sku")]).filter(([id, sku]) => id && sku));
  const known = new Set(opts.knownCategories.map((c) => c.toLowerCase()));
  const rows: ParsedRow[] = raw.map((r, i) => {
    const t = get(r, "type").toLowerCase();
    const type: ParsedRow["type"] = t.includes("variation") ? "variation" : t.includes("variable") ? "variable" : "simple";
    const attributes = readAttributes(r);
    for (const key of ["size", "color"] as const) {
      const value = get(r, key);
      if (value && !attributes.some((a) => (key === "size" ? /size/i : /colou?r/i).test(a.name))) attributes.push({ name: key === "size" ? "Size" : "Color", values: value.split(/[,|]/).map((s) => s.trim()).filter(Boolean) });
    }
    const pick = (re: RegExp) => attributes.find((a) => re.test(a.name))?.values[0] ?? null;
    const row: ParsedRow = {
      line: i + 2, type, sku: get(r, "sku"), name: get(r, "name"), published: truthy(get(r, "published")), featured: truthy(get(r, "featured")),
      short_description: get(r, "short_description"), description: get(r, "description"),
      regular_price: num(get(r, "regular_price")), sale_price: num(get(r, "sale_price")),
      category: leafCategory(get(r, "categories")), images: get(r, "images").split(",").map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s)),
      stock: num(get(r, "stock")), parent: /^id:/i.test(get(r, "parent")) ? originalIds.get(get(r, "parent").slice(3)) ?? get(r, "parent").slice(3) : get(r, "parent"),
      weight: num(get(r, "weight")), length: num(get(r, "length")), width: num(get(r, "width")), height: num(get(r, "height")),
      size: pick(/size/i), color: pick(/colou?r/i), attributes, errors: [],
    };
    return row;
  });

  const skuCount = new Map<string, number>();
  rows.forEach((r) => r.sku && skuCount.set(r.sku.toLowerCase(), (skuCount.get(r.sku.toLowerCase()) ?? 0) + 1));
  const parentSkus = new Set(rows.filter((r) => r.type === "variable").map((r) => r.sku.toLowerCase()));
  (opts.existingSkus ?? []).forEach((s) => parentSkus.add(s.toLowerCase()));

  const combinations = new Set<string>();
  for (const r of rows) {
    const e = r.errors;
    if (!r.sku) e.push("Missing SKU");
    else if (r.sku.length > 60) e.push("SKU too long");
    else if ((skuCount.get(r.sku.toLowerCase()) ?? 0) > 1) e.push("Duplicate SKU in file");
    if (r.type !== "variation" && !r.name) e.push("Missing name");
    if (r.name.length > 200) e.push("Name too long");
    const priceNeeded = r.type !== "variable";
    if (Number.isNaN(r.regular_price) || (r.regular_price !== null && r.regular_price < 0)) e.push("Invalid price");
    else if (priceNeeded && r.regular_price === null && r.type === "simple") e.push("Invalid price");
    if (Number.isNaN(r.sale_price) || (r.sale_price !== null && r.sale_price < 0)) e.push("Invalid sale price");
    else if (r.sale_price !== null && r.regular_price !== null && !Number.isNaN(r.regular_price) && r.sale_price >= r.regular_price) e.push("Sale price must be below regular price");
    if (Number.isNaN(r.stock) || (r.stock !== null && (r.stock < 0 || !Number.isInteger(r.stock)))) e.push("Invalid stock");
    for (const k of ["weight", "length", "width", "height"] as const) if (Number.isNaN(r[k])) e.push(`Invalid ${k}`);
    if (r.type !== "variation") {
      if (!r.category) e.push("Missing category");
      else if (!known.has(r.category.toLowerCase()) && !opts.createMissingCategories) e.push(`Unknown category "${r.category}"`);
    } else {
      if (!r.parent) e.push("Variation has no Parent SKU");
      else if (!parentSkus.has(r.parent.toLowerCase())) e.push(`Parent "${r.parent}" not found`);
      if (!r.size && !r.color) e.push("Variation needs a Size or Color attribute");
      const combo = `${r.parent.toLowerCase()}|${(r.size ?? "One Size").toLowerCase()}|${(r.color ?? "").toLowerCase()}`;
      if (combinations.has(combo)) e.push("Duplicate Size / Color combination");
      combinations.add(combo);
    }
  }
  for (const parent of rows.filter((r) => r.type === "variable" && r.regular_price === null)) {
    const children = rows.filter((r) => r.type === "variation" && r.parent.toLowerCase() === parent.sku.toLowerCase() && !r.errors.length && r.regular_price !== null);
    if (children.length) {
      parent.regular_price = Math.min(...children.map((r) => r.regular_price as number));
      parent.sale_price = Math.min(...children.map((r) => r.sale_price ?? r.regular_price as number));
      if (parent.sale_price >= parent.regular_price) parent.sale_price = null;
    } else parent.errors.push("Variable product needs a price or valid priced variations");
  }
  return rows;
}

// ---------- Export ----------
export const EXPORT_COLUMNS = [
  "ID", "Type", "SKU", "Name", "Published", "Is featured?", "Short description", "Description",
  "In stock?", "Stock", "Regular price", "Sale price", "Categories", "Images", "Parent",
  "Weight (kg)", "Length (cm)", "Width (cm)", "Height (cm)",
  "Attribute 1 name", "Attribute 1 value(s)", "Attribute 1 visible", "Attribute 1 global",
  "Attribute 2 name", "Attribute 2 value(s)", "Attribute 2 visible", "Attribute 2 global",
] as const;
export type ExportColumn = (typeof EXPORT_COLUMNS)[number];

type ExpProduct = {
  id: string; sku: string | null; name: string; is_published: boolean; featured: boolean; short_description: string | null; description: string;
  stock: number; original_price: number; price: number; category: string | null; images: string[]; product_type: string;
  weight: number | null; length_cm: number | null; width_cm: number | null; height_cm: number | null; sizes: string[]; colors: string[];
  variants: { sku: string | null; size: string; color: string | null; stock: number; price: number | null; sale_price: number | null; image_url: string | null; status: string }[];
};

const stripHtml = (s: string | null) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function buildExportRows(products: ExpProduct[]): Record<ExportColumn, string | number>[] {
  const out: Record<ExportColumn, string | number>[] = [];
  const blank = () => Object.fromEntries(EXPORT_COLUMNS.map((c) => [c, ""])) as Record<ExportColumn, string | number>;
  for (const p of products) {
    const variable = p.variants.length > 0;
    const sizes = variable ? [...new Set(p.variants.map((v) => v.size).filter(Boolean))] : p.sizes;
    const colors = variable ? [...new Set(p.variants.map((v) => v.color).filter(Boolean) as string[])] : p.colors;
    const onSale = p.original_price > p.price;
    const r = blank();
    Object.assign(r, {
      ID: "", Type: variable ? "variable" : "simple", SKU: p.sku ?? "", Name: p.name, Published: p.is_published ? 1 : 0, "Is featured?": p.featured ? 1 : 0,
      "Short description": stripHtml(p.short_description), Description: stripHtml(p.description), "In stock?": p.stock > 0 ? 1 : 0, Stock: p.stock,
      "Regular price": variable ? "" : p.original_price, "Sale price": variable || !onSale ? "" : p.price, Categories: p.category ?? "", Images: p.images.join(", "),
      "Weight (kg)": p.weight ?? "", "Length (cm)": p.length_cm ?? "", "Width (cm)": p.width_cm ?? "", "Height (cm)": p.height_cm ?? "",
    });
    if (sizes.length) Object.assign(r, { "Attribute 1 name": "Size", "Attribute 1 value(s)": sizes.join(", "), "Attribute 1 visible": 1, "Attribute 1 global": 1 });
    if (colors.length) Object.assign(r, { "Attribute 2 name": "Color", "Attribute 2 value(s)": colors.join(", "), "Attribute 2 visible": 1, "Attribute 2 global": 1 });
    out.push(r);
    for (const v of p.variants) {
      const vr = blank();
      const reg = v.price ?? p.original_price;
      Object.assign(vr, {
        Type: "variation", SKU: v.sku ?? "", Name: `${p.name} - ${[v.size, v.color].filter(Boolean).join(", ")}`, Published: v.status === "inactive" ? 0 : 1,
        "In stock?": v.stock > 0 ? 1 : 0, Stock: v.stock, "Regular price": reg, "Sale price": v.sale_price ?? "", Images: v.image_url ?? "", Parent: p.sku ?? "",
        "Attribute 1 name": v.size ? "Size" : "", "Attribute 1 value(s)": v.size ?? "", "Attribute 1 global": v.size ? 1 : "",
        "Attribute 2 name": v.color ? "Color" : "", "Attribute 2 value(s)": v.color ?? "", "Attribute 2 global": v.color ? 1 : "",
      });
      out.push(vr);
    }
  }
  return out;
}

export const SAMPLE_CSV = [
  "Type,SKU,Name,Published,Is featured?,Short description,Description,Stock,Regular price,Sale price,Categories,Images,Parent,Attribute 1 name,Attribute 1 value(s),Attribute 1 visible,Attribute 1 global,Attribute 2 name,Attribute 2 value(s),Attribute 2 visible,Attribute 2 global",
  'simple,IHS-DUP-001,Hand Embroidered Chikankari Dupatta,1,0,Soft mul dupatta,"Pure mul dupatta with hand chikankari",12,1899,1599,Dupattas,https://example.com/dupatta.jpg,,,,,,,,,',
  'variable,IHS-KURTI-001,White Chikankari Kurti,1,1,Everyday cotton kurti,"Hand-embroidered cotton kurti from Lucknow",,,,Kurtis,https://example.com/kurti.jpg,,Size,"S, M",1,1,Color,"White, Black",1,1',
  "variation,IHS-KURTI-001-WHT-S,,1,,,,5,2499,1999,,,IHS-KURTI-001,Size,S,,1,Color,White,,1",
  "variation,IHS-KURTI-001-WHT-M,,1,,,,8,2499,,,,IHS-KURTI-001,Size,M,,1,Color,White,,1",
  "variation,IHS-KURTI-001-BLK-S,,1,,,,3,2499,,,,IHS-KURTI-001,Size,S,,1,Color,Black,,1",
].join("\n");
