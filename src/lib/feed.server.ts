import type { FeedRow } from "./feed";

// Public feed: only published, non-deleted products, only public catalog fields.
export async function loadFeedRows(): Promise<FeedRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,name,slug,sku,description,short_description,price,original_price,stock,images,color,sizes,categories(name)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("menu_order");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, category_name: r.categories?.name ?? null }));
}
