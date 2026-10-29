import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { analyticsConfig } from "./analytics-config";

export const publicAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return analyticsConfig(null);
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key); return fetch(input, { ...init, headers });
  } } });
  const { data } = await db.from("app_settings").select("value").eq("key", "analytics").maybeSingle();
  return analyticsConfig(data?.value);
});