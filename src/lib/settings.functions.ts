import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const KeySchema = z.string().min(1).max(80).regex(/^[a-z0-9_.\-]+$/i);

export const getSetting = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { key: string }) => ({ key: KeySchema.parse(d.key) }))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", data.key)
      .maybeSingle();
    return { value: (row?.value ?? null) as unknown };
  });

export const saveSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { key: string; value: unknown }) => ({
    key: KeySchema.parse(d.key),
    value: d.value as Record<string, unknown> | unknown[] | null,
  }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: data.key, value: data.value as never, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p] as const));
    return {
      rows: (roles ?? []).map((r) => ({
        user_id: r.user_id,
        role: r.role as string,
        created_at: r.created_at as string,
        name: pmap.get(r.user_id)?.full_name ?? null,
        phone: pmap.get(r.user_id)?.phone ?? null,
      })),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { user_id: string; role: "admin" | "customer"; action: "add" | "remove" }) =>
    z.object({
      user_id: z.string().uuid(),
      role: z.enum(["admin", "customer"]),
      action: z.enum(["add", "remove"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });