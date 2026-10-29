import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";

const TABLES = ["categories", "brands", "attributes", "attribute_values", "products", "product_variants", "coupons", "app_settings"] as const;

export const exportStoreBackup = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const tables: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from(table).select("*").order(table === "app_settings" ? "key" : "id").range(offset, offset + 499);
      if (error) throw new Error(`Could not back up ${table}`);
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
    }
    tables[table] = rows;
  }
  return { format: "ihs-catalog-backup", version: 1, created_at: new Date().toISOString(), tables };
});

export const restoreStoreBackup = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((i) => z.object({ format: z.literal("ihs-catalog-backup"), version: z.literal(1), tables: z.record(z.array(z.record(z.unknown()))) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("restore_catalog_backup", { _tables: data.tables as any });
    if (error) throw new Error(error.message);
    return result;
  });

export const integrationStatus = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async ({ context }) => {
  const { error } = await context.supabase.from("products").select("id").limit(1);
  return {
    database: !error,
    razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    shiprocket: !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD),
  };
});

export const adminReportData = createServerFn({ method: "POST" }).middleware([requireAdmin]).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const results = await Promise.all([
    db.from("orders").select("id,order_number,created_at,customer_name,total,subtotal,shipping,discount,payment_method,payment_status,status").order("created_at", { ascending: false }).limit(1000),
    db.from("products").select("id,name,sku,stock,reorder_level,price,status").is("deleted_at", null).order("name").limit(1000),
  ]);
  for (const r of results) if (r.error) throw new Error(r.error.message);
  return { orders: results[0].data ?? [], products: results[1].data ?? [] };
});