import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { scheduledPrice, saleIsActive } from "./growth-rules";

function createPublicServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing backend public environment variables for storefront products");
  }

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } },
  });
}

/**
 * Public, unauthenticated read of published products. Used by the storefront
 * to surface admin-managed inventory alongside the static demo catalogue.
 * Returns rows in the shape consumed by `src/data/products.ts#Product` so
 * existing UI components work without per-route changes.
 */
export const listPublishedProducts = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = createPublicServerClient();
  const { data, error } = await supabasePublic
    .from("products")
    .select("id, slug, name, description, specifications, attributes, care_instructions, shipping_info, return_policy, authenticity, price, original_price, sale_starts_at, sale_ends_at, color, colors, is_new, is_bestseller, stock, sizes, images, video_url, rating, reviews, low_stock_threshold, track_inventory, allow_backorders, default_size, default_color, product_variants(id,size,color,stock,price,sale_price,image_url,status), category:categories(slug, name)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any, i: number) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category?.slug ?? "uncategorised",
    price: scheduledPrice(r),
    originalPrice: Number(r.original_price),
    images: (r.images?.length ? r.images : [""]) as string[],
    videoUrl: r.video_url ?? null,
    variations: (r.product_variants ?? []).map((v: any) => ({ id: v.id, size: v.size, color: v.color, stock: Number(v.stock), price: v.price === null ? null : Number(v.price), salePrice: saleIsActive(r) && v.sale_price !== null ? Number(v.sale_price) : null, image: v.image_url, status: v.status })),
    defaultSize: r.default_size,
    defaultColor: r.default_color,
    allowBackorders: !!r.allow_backorders,
    sizes: (r.product_variants?.length ? [...new Set(r.product_variants.filter((v: any) => v.status !== "inactive").map((v: any) => v.size))] : r.sizes ?? []) as string[],
    colors: (Array.isArray(r.colors) && r.colors.length > 0)
      ? r.colors
      : (r.color ? [r.color] : []),
    specifications: r.specifications && typeof r.specifications === "object" ? r.specifications : {},
    attributes: r.attributes && typeof r.attributes === "object" ? r.attributes : {},
    careInstructions: Array.isArray(r.care_instructions) ? r.care_instructions : [],
    shippingInfo: Array.isArray(r.shipping_info) ? r.shipping_info : [],
    returnPolicy: Array.isArray(r.return_policy) ? r.return_policy : [],
    authenticity: r.authenticity ?? null,
    description: r.description ?? "",
    inStock: r.track_inventory === false || r.allow_backorders || (r.product_variants?.length ? r.product_variants.some((v: any) => v.status !== "inactive" && v.stock > 0) : (r.stock ?? 0) > 0),
    stock: Number(r.stock ?? 0),
    lowStockThreshold: Number(r.low_stock_threshold ?? 5),
    trackInventory: r.track_inventory !== false,
    rating: Number(r.rating ?? 4.7),
    reviews: Number(r.reviews ?? 0),
    isNew: !!r.is_new,
    isBestseller: !!r.is_bestseller,
    isSale: Number(r.original_price) > scheduledPrice(r),
    isDemo: false,
    cardShape: (["taj", "imambara", "clocktower"] as const)[i % 3],
  }));
});

export const listPublishedCategories = createServerFn({ method: "GET" }).handler(async () => {
  const db = createPublicServerClient();
  const { data, error } = await db.from("categories").select("id,name,slug,description,image_url,sort_order,parent_id").order("sort_order");
  if (error) throw new Error("Could not load categories");
  return data ?? [];
});