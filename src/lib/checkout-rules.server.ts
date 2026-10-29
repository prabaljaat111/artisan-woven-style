import { DEFAULT_CHECKOUT_RULES, type CheckoutRules } from "./checkout-rules";
export async function readCheckoutRules(): Promise<CheckoutRules> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("app_settings").select("key,value").in("key", ["payment", "shipping.rules"]);
  if (error) throw new Error("Could not load checkout settings");
  const rules = { ...DEFAULT_CHECKOUT_RULES };
  for (const row of data ?? []) {
    const value = row.value && typeof row.value === "object" && !Array.isArray(row.value) ? row.value as Record<string, unknown> : {};
    const allowed = row.key === "payment" ? ["cod_enabled", "cod_min", "cod_max", "cod_fee", "razorpay_enabled"] : ["flat_rate", "free_shipping_threshold"];
    for (const key of allowed) {
      const k = key as keyof CheckoutRules;
      if (typeof rules[k] === "boolean" && typeof value[k] === "boolean") (rules as any)[k] = value[k];
      if (typeof rules[k] === "number" && typeof value[k] === "number" && Number.isFinite(value[k]) && Number(value[k]) >= 0) (rules as any)[k] = value[k];
    }
  }
  return rules;
}