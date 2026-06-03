
-- app_settings: backend-only key-value config
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- shipments: one per order (Shiprocket shipment)
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'shiprocket',
  sr_order_id text,
  sr_shipment_id text,
  awb_code text,
  courier_company_id integer,
  courier_name text,
  status text NOT NULL DEFAULT 'created',
  pickup_scheduled_date text,
  pickup_token_number text,
  label_url text,
  manifest_url text,
  invoice_url text,
  tracking_url text,
  last_tracking jsonb,
  raw jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages shipments" ON public.shipments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users see own shipments" ON public.shipments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = shipments.order_id AND o.user_id = auth.uid()));

CREATE TRIGGER shipments_set_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER app_settings_set_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default Shiprocket settings (pickup nickname matches user's Shiprocket panel)
INSERT INTO public.app_settings (key, value) VALUES
  ('shiprocket', '{"pickup_location":"Primary","length_cm":25,"breadth_cm":20,"height_cm":5,"weight_kg":0.5}'::jsonb)
ON CONFLICT (key) DO NOTHING;
