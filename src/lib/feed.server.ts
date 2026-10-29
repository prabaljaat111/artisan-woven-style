import type { FeedRow } from "./feed";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { scheduledPrice, saleIsActive } from "./growth-rules";

// Public feed: only published, non-deleted products, only public catalog fields.
export async function loadFeedRows(): Promise<FeedRow[]> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Catalog connection unavailable");
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
  const rows: FeedRow[] = [];
  for (let offset = 0; ; offset += 200) {
  const { data, error } = await db
    .from("products")
    .select("id,name,slug,sku,description,short_description,price,original_price,sale_starts_at,sale_ends_at,stock,images,color,sizes,categories(name),product_variants(id,sku,size,color,price,sale_price,stock,image_url,status)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("id").range(offset, offset + 199);
  if (error) throw error;
  rows.push(...(data ?? []).map((r) => ({ ...r, price: scheduledPrice(r), category_name: r.categories?.name ?? null, variants: r.product_variants.map(v=>({...v,sale_price:saleIsActive(r)?v.sale_price:null})) })));
  if ((data?.length ?? 0) < 200) return rows;
  }
}
