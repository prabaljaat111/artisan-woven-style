REVOKE EXECUTE ON FUNCTION public.emit_stock_alert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_product_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_stock_alert() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_product_stock() TO service_role;