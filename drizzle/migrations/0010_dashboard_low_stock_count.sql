CREATE OR REPLACE FUNCTION public.dashboard_overview(_from timestamp with time zone, _to timestamp with time zone)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  pfrom timestamptz := _from - (_to - _from);
  result jsonb;
BEGIN
  IF NOT public.can_approve(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'current', (SELECT jsonb_build_object('sales', COALESCE(SUM(total),0), 'orders', COUNT(*))
                FROM orders WHERE created_at >= _from AND created_at < _to AND status NOT IN ('cancelled')),
    'previous', (SELECT jsonb_build_object('sales', COALESCE(SUM(total),0), 'orders', COUNT(*))
                FROM orders WHERE created_at >= pfrom AND created_at < _from AND status NOT IN ('cancelled')),
    'low_stock', (SELECT COUNT(*) FROM public.low_stock_items()),
    'status', (SELECT COALESCE(jsonb_object_agg(status, c), '{}'::jsonb) FROM (
                SELECT status::text, COUNT(*) c FROM orders WHERE created_at >= _from AND created_at < _to GROUP BY status) s),
    'awaiting_dispatch', (SELECT COUNT(*) FROM orders WHERE status = 'paid'),
    'returns', (SELECT COUNT(*) FROM orders WHERE status = 'refunded' AND updated_at >= _from),
    'new_messages', (SELECT COUNT(*) FROM leads WHERE status = 'new'),
    'top_products', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
                SELECT oi.product_name AS name, MAX(oi.image) AS image, MAX(oi.price) AS price, SUM(oi.qty)::int AS sold
                FROM order_items oi JOIN orders o ON o.id = oi.order_id
                WHERE o.created_at >= _from AND o.created_at < _to AND o.status <> 'cancelled'
                GROUP BY oi.product_name ORDER BY SUM(oi.qty) DESC LIMIT 5) t)
  ) INTO result;
  RETURN result;
END $function$;