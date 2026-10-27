CREATE OR REPLACE FUNCTION public.dashboard_overview(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  span interval := _to - _from;
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
    'low_stock', (SELECT COUNT(*) FROM products WHERE track_inventory AND stock <= COALESCE(reorder_level, low_stock_threshold, 5)),
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
END $$;

CREATE OR REPLACE FUNCTION public.dashboard_sales_trend(_days integer)
RETURNS TABLE(day date, sales numeric, orders bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_approve(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT d::date, COALESCE(SUM(o.total),0), COUNT(o.id)
  FROM generate_series(current_date - (_days - 1), current_date, interval '1 day') d
  LEFT JOIN orders o ON o.created_at::date = d::date AND o.status <> 'cancelled'
  GROUP BY d ORDER BY d;
END $$;

REVOKE EXECUTE ON FUNCTION public.dashboard_overview(timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_sales_trend(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.dashboard_overview(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_sales_trend(integer) TO authenticated;