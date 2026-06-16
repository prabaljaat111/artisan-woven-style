import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

function createPublicServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing backend public environment variables");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ============== DASHBOARD ==============
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [orders30, ordersAll, products, customers, recentOrders, lowStock, leadsCount] = await Promise.all([
      supabaseAdmin.from("orders").select("total, created_at, status").gte("created_at", since),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(8),
      // Pull a wider slice and let the threshold filter happen in JS so each
      // product's `low_stock_threshold` is respected (PostgREST can't compare
      // two columns directly).
      supabaseAdmin
        .from("products")
        .select("id, name, stock, images, low_stock_threshold, track_inventory")
        .eq("track_inventory", true)
        .order("stock")
        .limit(50),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
    ]);

    const rev30 = (orders30.data ?? []).reduce((s, o: any) => s + Number(o.total), 0);
    const cnt30 = orders30.data?.length ?? 0;

    // Build daily series for last 14 days
    const days: { d: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      const dayRows = (orders30.data ?? []).filter((o: any) => o.created_at.startsWith(key));
      days.push({
        d: key.slice(5),
        revenue: dayRows.reduce((s, o: any) => s + Number(o.total), 0),
        orders: dayRows.length,
      });
    }

    return {
      revenue30: rev30,
      orders30: cnt30,
      aov30: cnt30 > 0 ? Math.round(rev30 / cnt30) : 0,
      ordersTotal: ordersAll.count ?? 0,
      productsTotal: products.count ?? 0,
      customersTotal: customers.count ?? 0,
      leadsTotal: leadsCount.count ?? 0,
      recentOrders: recentOrders.data ?? [],
      lowStock: (lowStock.data ?? [])
        .filter((p: any) => Number(p.stock) <= Number(p.low_stock_threshold ?? 5))
        .slice(0, 8),
      daily: days,
    };
  });

// ============== PRODUCTS ==============
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("*, category:categories(name, slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetProduct = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("products").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

const ProductInput = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "lowercase, digits and dashes only"),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  category_id: z.string().uuid().nullable().optional(),
  price: z.number().min(0).max(1_000_000),
  original_price: z.number().min(0).max(1_000_000),
  color: z.string().max(80).nullable().optional(),
  is_new: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  is_published: z.boolean().default(true),
  stock: z.number().int().min(0).max(99999).default(0),
  sizes: z.array(z.string().min(1).max(20)).min(1).max(20),
  images: z.array(z.string().min(1).max(2000)).min(1).max(12),
  low_stock_threshold: z.number().int().min(0).max(9999).default(5),
  track_inventory: z.boolean().default(true),
});

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => ProductInput.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("products").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await context.supabase.from("products").insert(rest).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BulkInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(["publish", "unpublish", "delete", "bestseller_on", "bestseller_off", "new_on", "new_off"]),
});

export const adminBulkProducts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => BulkInput.parse(i))
  .handler(async ({ data, context }) => {
    const { ids, action } = data;
    if (action === "delete") {
      const { error } = await context.supabase.from("products").delete().in("id", ids);
      if (error) throw new Error(error.message);
      return { ok: true, count: ids.length };
    }
    const patches = {
      publish: { is_published: true },
      unpublish: { is_published: false },
      bestseller_on: { is_bestseller: true },
      bestseller_off: { is_bestseller: false },
      new_on: { is_new: true },
      new_off: { is_new: false },
    } as const;
    const { error } = await context.supabase.from("products").update(patches[action]).in("id", ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: ids.length };
  });

// ---- Bulk CSV import (upsert by slug) ----
const BulkRow = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  category_slug: z.string().max(80).optional().nullable(),
  price: z.number().min(0).max(1_000_000),
  original_price: z.number().min(0).max(1_000_000),
  color: z.string().max(80).optional().nullable(),
  is_new: z.boolean().optional().default(false),
  is_bestseller: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(true),
  stock: z.number().int().min(0).max(99999).optional().default(0),
  sizes: z.array(z.string().min(1).max(20)).min(1).max(20),
  images: z.array(z.string().min(1).max(2000)).min(1).max(12),
  low_stock_threshold: z.number().int().min(0).max(9999).optional().default(5),
  track_inventory: z.boolean().optional().default(true),
});
const BulkUpsertInput = z.object({ rows: z.array(z.any()).min(1).max(500) });

export const adminBulkUpsertProducts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => BulkUpsertInput.parse(i))
  .handler(async ({ data, context }) => {
    // Validate rows individually so one bad row doesn't kill the whole batch.
    const valid: z.infer<typeof BulkRow>[] = [];
    const errors: string[] = [];
    data.rows.forEach((raw: any, idx: number) => {
      const parsed = BulkRow.safeParse(raw);
      if (parsed.success) valid.push(parsed.data);
      else {
        const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
        errors.push(`Row ${idx + 1} (${raw?.slug ?? raw?.name ?? "?"}): ${msg}`);
      }
    });
    if (valid.length === 0) {
      return { ok: false, processed: 0, attempted: data.rows.length, errors };
    }
    // Resolve category slugs → ids
    const slugs = Array.from(
      new Set(valid.map((r) => r.category_slug).filter((s): s is string => !!s)),
    );
    const catMap = new Map<string, string>();
    if (slugs.length > 0) {
      const { data: cats } = await context.supabase
        .from("categories")
        .select("id, slug")
        .in("slug", slugs);
      (cats ?? []).forEach((c: any) => catMap.set(c.slug, c.id));
    }
    const payload = valid.map((r) => {
      const { category_slug, ...rest } = r;
      return {
        ...rest,
        category_id: category_slug ? catMap.get(category_slug) ?? null : null,
      };
    });
    // Chunk to avoid request size limits. On batch failure, fall back to per-row
    // upserts so a single bad row doesn't take the whole batch down.
    const CHUNK = 50;
    let inserted = 0;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const batch = payload.slice(i, i + CHUNK);
      const { error, count } = await context.supabase
        .from("products")
        .upsert(batch, { onConflict: "slug", count: "exact" });
      if (!error) {
        inserted += count ?? batch.length;
        continue;
      }
      // Retry one-by-one so we can pinpoint the offending row.
      for (const row of batch) {
        const { error: rowErr } = await context.supabase
          .from("products")
          .upsert(row, { onConflict: "slug" });
        if (rowErr) errors.push(`${row.slug}: ${rowErr.message}`);
        else inserted++;
      }
    }
    return { ok: errors.length === 0, processed: inserted, attempted: payload.length, errors };
  });

// ============== ORDERS ==============
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetOrder = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const [{ data: order }, { data: items }] = await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", data.id).single(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", data.id),
    ]);
    if (!order) throw new Error("Order not found");
    return { order, items: items ?? [] };
  });

const OrderUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled", "refunded"]).optional(),
  payment_status: z.enum(["unpaid", "paid", "failed", "refunded"]).optional(),
  tracking_number: z.string().max(120).optional().nullable(),
  tracking_url: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => OrderUpdate.parse(i))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("orders").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== CUSTOMERS ==============
export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const merged = (profiles ?? []).map((p: any) => {
      const u = users.users.find((x) => x.id === p.id);
      return { ...p, email: u?.email ?? null, last_sign_in_at: u?.last_sign_in_at ?? null };
    });
    // Order counts per user
    const ids = merged.map((m) => m.id);
    if (ids.length === 0) return [];
    const { data: ordersAgg } = await supabaseAdmin
      .from("orders")
      .select("user_id, total")
      .in("user_id", ids);
    const stats: Record<string, { count: number; spent: number }> = {};
    (ordersAgg ?? []).forEach((o: any) => {
      if (!o.user_id) return;
      stats[o.user_id] ??= { count: 0, spent: 0 };
      stats[o.user_id].count++;
      stats[o.user_id].spent += Number(o.total);
    });
    return merged.map((m) => ({ ...m, order_count: stats[m.id]?.count ?? 0, total_spent: stats[m.id]?.spent ?? 0 }));
  });

// ============== CATEGORIES ==============
export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("categories").select("*").order("sort_order");
    return data ?? [];
  });

const CatInput = z.object({
  id: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const adminUpsertCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => CatInput.parse(i))
  .handler(async ({ data }) => {
    if (data.id) {
      const { id, ...rest } = data;
      await supabaseAdmin.from("categories").update(rest).eq("id", id);
    } else {
      const { id: _o, ...rest } = data;
      await supabaseAdmin.from("categories").insert(rest);
    }
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("categories").delete().eq("id", data.id);
    return { ok: true };
  });

// ============== COUPONS ==============
export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const CouponInput = z.object({
  id: z.string().uuid().nullable().optional(),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/, "uppercase letters, digits, _-"),
  description: z.string().max(200).optional().nullable(),
  discount_type: z.enum(["percent", "flat"]),
  discount_value: z.number().min(0).max(100000),
  min_order: z.number().min(0).max(1_000_000).default(0),
  is_active: z.boolean().default(true),
  expires_at: z.string().datetime().nullable().optional(),
});

export const adminUpsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => CouponInput.parse(i))
  .handler(async ({ data }) => {
    if (data.id) {
      const { id, ...rest } = data;
      await supabaseAdmin.from("coupons").update(rest).eq("id", id);
    } else {
      const { id: _o, ...rest } = data;
      await supabaseAdmin.from("coupons").insert(rest);
    }
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    return { ok: true };
  });

// ============== REVIEWS ==============
export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("reviews")
      .select("*, product:products(name, slug, images)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminReviewSetApproval = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({ id: z.string().uuid(), is_approved: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("reviews").update({ is_approved: data.is_approved }).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    return { ok: true };
  });

// ============== PRODUCT VARIANTS (per-size inventory) ==============
export const adminListVariants = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((i: { productId: string }) =>
    z.object({ productId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", data.productId)
      .order("size");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const VariantUpsert = z.object({
  productId: z.string().uuid(),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional().nullable(),
        size: z.string().min(1).max(20),
        color: z.string().max(80).nullable().optional(),
        sku: z.string().max(80).nullable().optional(),
        stock: z.number().int().min(0).max(99999),
      }),
    )
    .max(200),
});

export const adminSaveVariants = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => VariantUpsert.parse(i))
  .handler(async ({ data, context }) => {
    // Replace strategy: delete rows missing from input, upsert the rest.
    const incomingIds = data.variants.map((v) => v.id).filter(Boolean) as string[];
    const { data: existing } = await context.supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", data.productId);
    const toDelete = (existing ?? [])
      .map((r: { id: string }) => r.id)
      .filter((id: string) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await context.supabase.from("product_variants").delete().in("id", toDelete);
    }
    for (const v of data.variants) {
      const row = {
        product_id: data.productId,
        size: v.size,
        color: v.color ?? null,
        sku: v.sku ?? null,
        stock: v.stock,
      };
      if (v.id) {
        const { error } = await context.supabase
          .from("product_variants")
          .update(row)
          .eq("id", v.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await context.supabase
          .from("product_variants")
          .insert(row);
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true };
  });

// Public read for storefront PDP (RLS already filters to published parents,
// but we go through service role for predictability and to avoid an extra
// round-trip when products are switched between draft/live).
export const getProductVariantsBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!product) return [] as Array<{ size: string; color: string | null; stock: number }>;
    const { data: rows } = await supabaseAdmin
      .from("product_variants")
      .select("size, color, stock")
      .eq("product_id", product.id);
    return rows ?? [];
  });