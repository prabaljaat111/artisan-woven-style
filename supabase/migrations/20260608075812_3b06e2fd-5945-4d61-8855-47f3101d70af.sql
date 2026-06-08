-- Phase 1: Inventory & stock alerts

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('low','out')),
  stock_at_alert integer NOT NULL DEFAULT 0,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_alerts_product_idx ON public.stock_alerts(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_alerts_unack_idx ON public.stock_alerts(acknowledged, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alerts TO authenticated;
GRANT ALL ON public.stock_alerts TO service_role;

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stock alerts"
  ON public.stock_alerts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: emit alerts when stock crosses low/out thresholds
CREATE OR REPLACE FUNCTION public.emit_stock_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold integer;
BEGIN
  IF NOT COALESCE(NEW.track_inventory, true) THEN
    RETURN NEW;
  END IF;
  threshold := COALESCE(NEW.low_stock_threshold, 5);

  -- Out of stock (new=0, old>0)
  IF NEW.stock = 0 AND COALESCE(OLD.stock, 1) > 0 THEN
    INSERT INTO public.stock_alerts (product_id, level, stock_at_alert)
    VALUES (NEW.id, 'out', NEW.stock);
  -- Low stock (new>0, new<=threshold, old above threshold)
  ELSIF NEW.stock > 0 AND NEW.stock <= threshold AND COALESCE(OLD.stock, threshold + 1) > threshold THEN
    INSERT INTO public.stock_alerts (product_id, level, stock_at_alert)
    VALUES (NEW.id, 'low', NEW.stock);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_stock_alert ON public.products;
CREATE TRIGGER products_stock_alert
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.emit_stock_alert();