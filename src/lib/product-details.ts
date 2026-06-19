import type { Product } from "@/data/products";

export type ProductDetailSections = {
  specifications: Array<[string, string]>;
  attributes: Array<[string, string]>;
  careInstructions: string[];
  shippingInfo: string[];
  returnPolicy: string[];
  authenticity?: string | null;
};

const CATEGORY_ALLOWED_SPEC_FIELDS: Record<string, string[]> = {
  sarees: ["Fabric", "Work", "Border", "Blouse Piece", "Length", "Saree Length", "Wash Care", "Color", "Colour", "Sizes"],
  kurtis: ["Fabric", "Sleeve Length", "Neck Style", "Fit", "Occasion", "Craft Type", "Pattern", "Color", "Colour", "Sizes", "Wash Care"],
  "kurta-sets": ["Fabric", "Kurta Length", "Bottom", "Dupatta", "Sleeve", "Sleeve Length", "Neck", "Neck Style", "Fit", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  "unstitched-suits": ["Fabric", "Work", "Suit Pieces", "Top", "Bottom", "Dupatta", "Stitching", "Color", "Colour", "Sizes", "Wash Care"],
  "co-ord-sets": ["Fabric", "Top", "Bottom", "Sleeve", "Sleeve Length", "Neck", "Neck Style", "Fit", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  "palazzo-sets": ["Fabric", "Top", "Bottom", "Dupatta", "Waist", "Length", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  "sharara-sets": ["Fabric", "Kurta Length", "Bottom", "Dupatta", "Sleeve", "Neck", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  "garara-sets": ["Fabric", "Kurta Length", "Bottom", "Dupatta", "Sleeve", "Neck", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  pants: ["Fabric", "Waist", "Length", "Fit", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  "tops-tunics": ["Fabric", "Sleeve", "Sleeve Length", "Neck", "Neck Style", "Fit", "Work", "Color", "Colour", "Sizes", "Wash Care"],
  "noodle-strap": ["Fabric", "Strap", "Neck", "Neck Style", "Fit", "Work", "Color", "Colour", "Sizes", "Wash Care"],
};

const INTERNAL_KEYS = new Set(["id", "product_id", "productid", "slug", "category", "items", "specs", "specifications", "attributes"]);

function labelKey(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleCase(label: string) {
  return label.replace(/[_-]+/g, " ").trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function objectEntries(value: unknown, productId: string, nestedKeys: string[] = []): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value as Record<string, unknown>;
  const boundId = raw.product_id ?? raw.productId ?? raw.id;
  if (boundId && String(boundId) !== productId) return [];
  for (const key of nestedKeys) {
    const nested = raw[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return objectEntries(nested, productId);
    }
  }
  return Object.entries(raw)
    .filter(([key]) => !INTERNAL_KEYS.has(key.toLowerCase().replace(/[^a-z0-9_]+/g, "")))
    .map(([key, val]) => [titleCase(key), Array.isArray(val) ? val.join(" · ") : String(val ?? "").trim()] as [string, string])
    .filter(([, val]) => val.length > 0);
}

function allowedSpecFields(category: string) {
  return new Set((CATEGORY_ALLOWED_SPEC_FIELDS[category] ?? ["Fabric", "Work", "Pattern", "Color", "Colour", "Sizes", "Wash Care"]).map(labelKey));
}

function uniquePairs(pairs: Array<[string, string]>) {
  const seen = new Set<string>();
  return pairs.filter(([label]) => {
    const key = labelKey(label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function buildProductDetailSections(product: Product, selectedColor?: string): ProductDetailSections {
  const allowed = allowedSpecFields(product.category);
  const ownSpecs = objectEntries(product.specifications, product.id, ["specifications", "specs", "items"])
    .filter(([label]) => allowed.has(labelKey(label)));
  const productFacts: Array<[string, string]> = [
    selectedColor ? ["Color", selectedColor] : null,
    product.sizes?.length ? ["Sizes", product.sizes.join(" · ")] : null,
  ].filter(Boolean) as Array<[string, string]>;

  return {
    specifications: uniquePairs([...ownSpecs, ...productFacts.filter(([label]) => allowed.has(labelKey(label)))]),
    attributes: uniquePairs(objectEntries(product.attributes, product.id, ["attributes", "items"])),
    careInstructions: cleanList(product.careInstructions),
    shippingInfo: cleanList(product.shippingInfo),
    returnPolicy: cleanList(product.returnPolicy),
    authenticity: product.authenticity?.trim() || null,
  };
}