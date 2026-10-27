ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_reduced boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name text;
UPDATE public.orders SET razorpay_order_id = payment_reference WHERE payment_reference LIKE 'order\_%';
-- orders already confirmed before this change: treat stock as already taken
UPDATE public.orders SET stock_reduced = true WHERE status IN ('paid','shipped','delivered');

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'status',
  status text,
  message text NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON public.order_events(order_id, created_at);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads order events" ON public.order_events FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.order_stock_and_timeline() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; vid uuid; prev integer; confirmed boolean; reversed boolean; dir integer;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      INSERT INTO order_events (order_id, kind, status, message, actor_id) VALUES (NEW.id, 'payment', NEW.payment_status::text, 'Payment marked ' || NEW.payment_status::text, auth.uid());
    END IF;
    IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number AND NEW.tracking_number IS NOT NULL THEN
      INSERT INTO order_events (order_id, kind, message, actor_id) VALUES (NEW.id, 'tracking', 'Tracking ID added: ' || NEW.tracking_number, auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO order_events (order_id, kind, status, message, actor_id) VALUES (NEW.id, 'status', NEW.status::text, 'Status changed to ' || initcap(NEW.status::text), auth.uid());

  confirmed := NEW.status::text IN ('paid','processing','shipped','delivered');
  reversed := NEW.status::text IN ('cancelled','returned','refunded');
  IF confirmed AND NOT NEW.stock_reduced THEN dir := -1;
  ELSIF reversed AND NEW.stock_reduced THEN dir := 1;
  ELSE RETURN NEW; END IF;

  FOR it IN SELECT product_id, size, color, qty FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
    vid := NULL;
    SELECT id, stock INTO vid, prev FROM product_variants
      WHERE product_id = it.product_id AND lower(size) = lower(COALESCE(it.size,'')) AND lower(COALESCE(color,'')) = lower(COALESCE(it.color, color, ''))
      ORDER BY (lower(COALESCE(color,'')) = lower(COALESCE(it.color,''))) DESC LIMIT 1 FOR UPDATE;
    IF vid IS NOT NULL THEN
      UPDATE product_variants SET stock = GREATEST(stock + dir * it.qty, 0) WHERE id = vid;
    ELSE
      SELECT stock INTO prev FROM products WHERE id = it.product_id FOR UPDATE;
      IF NOT FOUND OR EXISTS (SELECT 1 FROM product_variants WHERE product_id = it.product_id) THEN CONTINUE; END IF;
      UPDATE products SET stock = GREATEST(stock + dir * it.qty, 0) WHERE id = it.product_id;
    END IF;
    INSERT INTO stock_logs (product_id, variation_id, adjustment_type, quantity, previous_stock, new_stock, reason, notes, user_id)
    VALUES (it.product_id, vid, CASE WHEN dir < 0 THEN 'reduce' ELSE 'add' END, it.qty, COALESCE(prev,0), GREATEST(COALESCE(prev,0) + dir * it.qty, 0),
      CASE WHEN dir < 0 THEN 'Sold Online' ELSE 'Returned' END, 'Order ' || NEW.order_number, auth.uid());
  END LOOP;
  NEW.stock_reduced := dir < 0;
  INSERT INTO order_events (order_id, kind, message, actor_id) VALUES (NEW.id, 'stock', CASE WHEN dir < 0 THEN 'Stock reduced for ordered items' ELSE 'Stock restored for ordered items' END, auth.uid());
  RETURN NEW;
END $$;
CREATE TRIGGER trg_orders_stock_timeline BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_stock_and_timeline();

CREATE OR REPLACE FUNCTION public.order_created_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO order_events (order_id, kind, status, message) VALUES (NEW.id, 'status', NEW.status::text, 'Order placed');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_orders_created_event AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_created_event();

INSERT INTO public.order_events (order_id, kind, status, message, created_at)
SELECT id, 'status', status::text, 'Order placed', created_at FROM public.orders;