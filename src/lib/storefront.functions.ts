import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function createPublicServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing backend public environment variables for storefront products");
  }

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
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
    .select("id, slug, name, description, specifications, attributes, care_instructions, shipping_info, return_policy, authenticity, price, original_price, color, colors, is_new, is_bestseller, stock, sizes, images, rating, reviews, low_stock_threshold, track_inventory, category:categories(slug, name)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any, i: number) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category?.slug ?? "uncategorised",
    price: Number(r.price),
    originalPrice: Number(r.original_price),
    images: (r.images?.length ? r.images : [""]) as string[],
    sizes: (r.sizes?.length ? r.sizes : ["XS", "S", "M", "L", "XL", "XXL"]) as string[],
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
    inStock: (r.stock ?? 0) > 0,
    stock: Number(r.stock ?? 0),
    lowStockThreshold: Number(r.low_stock_threshold ?? 5),
    trackInventory: r.track_inventory !== false,
    rating: Number(r.rating ?? 4.7),
    reviews: Number(r.reviews ?? 0),
    isNew: !!r.is_new,
    isBestseller: !!r.is_bestseller,
    isSale: Number(r.original_price) - Number(r.price) >= 1000,
    isDemo: false,
    cardShape: (["taj", "imambara", "clocktower"] as const)[i % 3],
  }));
});