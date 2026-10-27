ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approved_snapshot jsonb, ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  kind text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users mark own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TABLE public.product_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  actor_id uuid,
  actor_name text,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX approval_logs_product_idx ON public.product_approval_logs(product_id, created_at DESC);
GRANT SELECT ON public.product_approval_logs TO authenticated;
GRANT ALL ON public.product_approval_logs TO service_role;
ALTER TABLE public.product_approval_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvers read approval logs" ON public.product_approval_logs FOR SELECT TO authenticated USING (public.can_approve(auth.uid()) OR submitted_by = auth.uid());

-- stamp submission time whenever a product enters pending review
CREATE OR REPLACE FUNCTION public.stamp_submitted_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending_review' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending_review') THEN
    NEW.submitted_at := now();
    IF NEW.submitted_by IS NULL THEN NEW.submitted_by := auth.uid(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_stamp_submitted BEFORE INSERT OR UPDATE OF status ON public.products FOR EACH ROW EXECUTE FUNCTION public.stamp_submitted_at();

CREATE OR REPLACE FUNCTION public.team_member_names(_ids uuid[])
RETURNS TABLE(id uuid, name text, role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, COALESCE(NULLIF(p.full_name,''), split_part(u.email,'@',1)),
    (SELECT r.role::text FROM user_roles r WHERE r.user_id = u.id ORDER BY CASE r.role::text WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 WHEN 'staff' THEN 3 ELSE 4 END LIMIT 1)
  FROM auth.users u LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = ANY(_ids) AND public.is_team_member(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.team_member_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_member_names(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_product(_product_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; actor text;
BEGIN
  IF uid IS NULL OR NOT public.can_approve(uid) THEN RAISE EXCEPTION 'Only admins and managers can approve products'; END IF;
  SELECT id, name, submitted_by, status INTO p FROM products WHERE id = _product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF NOT _approve AND (_reason IS NULL OR length(trim(_reason)) < 5) THEN RAISE EXCEPTION 'Please give a reason (at least 5 characters)'; END IF;
  IF _reason IS NOT NULL AND length(_reason) > 1000 THEN RAISE EXCEPTION 'Reason too long'; END IF;
  SELECT name INTO actor FROM public.team_member_names(ARRAY[uid]);

  IF _approve THEN
    UPDATE products SET status = 'active', is_published = true, rejection_reason = NULL, updated_at = now() WHERE id = _product_id;
    UPDATE products SET approved_snapshot = jsonb_build_object(
      'name', name, 'short_description', short_description, 'description', description, 'price', price, 'original_price', original_price,
      'category_id', category_id, 'sku', sku, 'stock', stock, 'images', to_jsonb(images), 'sizes', to_jsonb(sizes), 'colors', to_jsonb(colors),
      'specifications', specifications, 'seo_title', seo_title, 'meta_description', meta_description)
    WHERE id = _product_id;
  ELSE
    UPDATE products SET status = 'rejected', is_published = false, rejection_reason = trim(_reason), updated_at = now() WHERE id = _product_id;
  END IF;

  INSERT INTO product_approval_logs (product_id, action, reason, actor_id, actor_name, submitted_by)
  VALUES (_product_id, CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, NULLIF(trim(COALESCE(_reason,'')),''), uid, actor, p.submitted_by);

  IF p.submitted_by IS NOT NULL AND p.submitted_by <> uid THEN
    INSERT INTO notifications (user_id, title, body, link, kind) VALUES (
      p.submitted_by,
      CASE WHEN _approve THEN 'Product approved: ' || p.name ELSE 'Product rejected: ' || p.name END,
      CASE WHEN _approve THEN 'It is now live on the store.' ELSE 'Reason: ' || trim(_reason) END,
      '/admin/products/' || _product_id::text,
      CASE WHEN _approve THEN 'success' ELSE 'error' END);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.decide_product(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_product(uuid, boolean, text) TO authenticated;

-- existing live products: baseline snapshot for future change comparison
UPDATE public.products SET approved_snapshot = jsonb_build_object(
  'name', name, 'short_description', short_description, 'description', description, 'price', price, 'original_price', original_price,
  'category_id', category_id, 'sku', sku, 'stock', stock, 'images', to_jsonb(images), 'sizes', to_jsonb(sizes), 'colors', to_jsonb(colors),
  'specifications', specifications, 'seo_title', seo_title, 'meta_description', meta_description)
WHERE status = 'active' AND approved_snapshot IS NULL;