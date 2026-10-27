ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS allow_backorders boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_status text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS shipping_class text,
  ADD COLUMN IF NOT EXISTS upsell_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cross_sell_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS purchase_note text,
  ADD COLUMN IF NOT EXISTS menu_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD CONSTRAINT products_stock_status_chk CHECK (stock_status IN ('auto','in_stock','out_of_stock','on_backorder'));

CREATE OR REPLACE FUNCTION public.enforce_product_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.can_approve(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- staff may keep a draft or submit for review, never publish
  IF NEW.status NOT IN ('draft','pending_review') THEN
    NEW.status := 'pending_review';
  END IF;
  NEW.is_published := false;
  NEW.submitted_by := auth.uid();
  RETURN NEW;
END $$;

CREATE POLICY "team uploads product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_team_member(auth.uid()));
CREATE POLICY "team updates product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_team_member(auth.uid()));
CREATE POLICY "team deletes product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_team_member(auth.uid()));