import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminLive(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => client.invalidateQueries({ predicate: query => query.queryKey[0] !== "product-edit" });
    const channel = supabase.channel(`admin-live-${Math.random().toString(36).slice(2)}`);
    for (const table of ["products", "product_variants", "categories", "orders", "stock_logs", "stock_alerts", "coupons", "leads", "reviews", "profiles", "user_roles", "brands", "attributes", "attribute_values", "import_jobs"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();
    const timer = setInterval(refresh, 30_000);
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [client, enabled]);
}