ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role::text in ('admin','manager','staff'))
$$;
CREATE OR REPLACE FUNCTION public.can_approve(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role::text in ('admin','manager'))
$$;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text, ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE TABLE public.brands (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE, logo_url text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.attributes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.attribute_values (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE, name text NOT NULL, slug text NOT NULL, sort_order integer NOT NULL DEFAULT 0, color_hex text, UNIQUE(attribute_id, slug));
CREATE TABLE public.stock_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, variation_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL, adjustment_type text NOT NULL, quantity integer NOT NULL, previous_stock integer NOT NULL DEFAULT 0, new_stock integer NOT NULL DEFAULT 0, reason text, user_id uuid, created_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS reorder_level integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.products ADD CONSTRAINT products_status_chk CHECK (status IN ('draft','pending_review','approved','rejected','active','inactive'));
ALTER TABLE public.products ADD CONSTRAINT products_type_chk CHECK (product_type IN ('simple','variable'));
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS price numeric, ADD COLUMN IF NOT EXISTS sale_price numeric, ADD COLUMN IF NOT EXISTS image_url text, ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

GRANT SELECT ON public.brands, public.attributes, public.attribute_values TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands, public.attributes, public.attribute_values, public.stock_logs TO authenticated;
GRANT ALL ON public.brands, public.attributes, public.attribute_values, public.stock_logs TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team manages brands" ON public.brands FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "attributes public read" ON public.attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team manages attributes" ON public.attributes FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "attr values public read" ON public.attribute_values FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team manages attr values" ON public.attribute_values FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team reads stock logs" ON public.stock_logs FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team writes stock logs" ON public.stock_logs FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()) AND user_id = auth.uid());

-- team access to products (staff edits go to review; approval guarded by trigger)
CREATE POLICY "team reads products" ON public.products FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team inserts products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team updates products" ON public.products FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team manages variants" ON public.product_variants FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team reads categories" ON public.categories FOR ALL TO authenticated USING (public.can_approve(auth.uid())) WITH CHECK (public.can_approve(auth.uid()));
CREATE POLICY "team reads roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_product_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.can_approve(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- staff: every save goes to review and stays unpublished
  NEW.status := 'pending_review';
  NEW.is_published := false;
  NEW.submitted_by := auth.uid();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_products_approval BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_product_approval();