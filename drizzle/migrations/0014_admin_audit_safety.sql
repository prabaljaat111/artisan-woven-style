CREATE OR REPLACE FUNCTION public.save_product_form(_id uuid, _product jsonb, _variations jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE pid uuid; result jsonb; cols text; vals text; assignments text; v jsonb; vid uuid; kept uuid[] := '{}'; allowed text[] := ARRAY['name','slug','sku','short_description','description','category_id','brand_id','product_type','original_price','price','on_sale','sale_starts_at','sale_ends_at','featured','images','track_inventory','reorder_level','low_stock_threshold','allow_backorders','stock_status','weight','length_cm','width_cm','height_cm','dimensions','shipping_class','upsell_ids','cross_sell_ids','product_attributes','seo_title','meta_description','purchase_note','menu_order','reviews_enabled','default_size','default_color','status','is_published','sizes','colors','color','rejection_reason','submitted_by','stock'];
BEGIN
 IF NOT public.is_team_member(auth.uid()) THEN RAISE EXCEPTION 'Team access required'; END IF;
 IF jsonb_typeof(_product) <> 'object' OR jsonb_typeof(_variations) <> 'array' THEN RAISE EXCEPTION 'Invalid product data'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(_product) k WHERE NOT k = ANY(allowed)) THEN RAISE EXCEPTION 'Unsupported product field'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('ihs-product-form'));
 SELECT string_agg(format('%I',c.column_name), ', '), string_agg(format('r.%I',c.column_name), ', '), string_agg(format('%I = r.%I',c.column_name,c.column_name), ', ') INTO cols,vals,assignments FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name='products' AND _product ? c.column_name AND c.column_name=ANY(allowed);
 IF _id IS NULL THEN
  EXECUTE format('INSERT INTO public.products (%s) SELECT %s FROM jsonb_populate_record(NULL::public.products,$1) r RETURNING id',cols,vals) INTO pid USING _product;
 ELSE
  PERFORM 1 FROM products WHERE id=_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or not editable'; END IF;
  EXECUTE format('UPDATE public.products p SET %s FROM jsonb_populate_record(NULL::public.products,$1) r WHERE p.id=$2 RETURNING p.id',assignments) INTO pid USING _product,_id;
 END IF;
 IF _product->>'product_type'='variable' THEN
  IF jsonb_array_length(_variations)=0 THEN RAISE EXCEPTION 'At least one variation is required'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_variations) x GROUP BY lower(trim(x->>'size')), lower(trim(COALESCE(x->>'color',''))) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate size/color combination'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_variations) x WHERE NULLIF(trim(x->>'sku'),'') IS NOT NULL GROUP BY upper(trim(x->>'sku')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate variation SKU'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(_variations) LOOP
   IF NULLIF(trim(v->>'size'),'') IS NULL OR (v->>'stock')::integer < 0 THEN RAISE EXCEPTION 'Invalid variation size or stock'; END IF;
   IF NULLIF(v->>'price','')::numeric < 0 OR NULLIF(v->>'sale_price','')::numeric < 0 OR (NULLIF(v->>'sale_price','')::numeric >= NULLIF(v->>'price','')::numeric) THEN RAISE EXCEPTION 'Invalid variation price'; END IF;
   IF NULLIF(trim(v->>'sku'),'') IS NOT NULL AND EXISTS (SELECT 1 FROM product_variants WHERE product_id<>pid AND upper(trim(sku))=upper(trim(v->>'sku'))) THEN RAISE EXCEPTION 'Variation SKU already exists'; END IF;
   SELECT id INTO vid FROM product_variants WHERE product_id=pid AND lower(trim(size))=lower(trim(v->>'size')) AND lower(trim(COALESCE(color,'')))=lower(trim(COALESCE(v->>'color',''))) LIMIT 1;
   IF vid IS NULL THEN
    INSERT INTO product_variants(product_id,size,color,sku,price,sale_price,stock,image_url,status) VALUES(pid,trim(v->>'size'),NULLIF(trim(v->>'color'),''),NULLIF(trim(v->>'sku'),''),NULLIF(v->>'price','')::numeric,NULLIF(v->>'sale_price','')::numeric,(v->>'stock')::integer,NULLIF(v->>'image_url',''),COALESCE(v->>'status','active')) RETURNING id INTO vid;
   ELSE
    UPDATE product_variants SET size=trim(v->>'size'),color=NULLIF(trim(v->>'color'),''),sku=NULLIF(trim(v->>'sku'),''),price=NULLIF(v->>'price','')::numeric,sale_price=NULLIF(v->>'sale_price','')::numeric,stock=(v->>'stock')::integer,image_url=NULLIF(v->>'image_url',''),status=COALESCE(v->>'status','active') WHERE id=vid;
   END IF;
   kept:=array_append(kept,vid); vid:=NULL;
  END LOOP;
  DELETE FROM product_variants WHERE product_id=pid AND NOT(id=ANY(kept));
 END IF;
 SELECT jsonb_build_object('id',id,'status',status) INTO result FROM products WHERE id=pid;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_product_form(uuid,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_product_form(uuid,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_admin_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.role::text='admin' AND (TG_OP='DELETE' OR NEW.role::text<>'admin') THEN
  PERFORM pg_advisory_xact_lock(hashtext('ihs-admin-roles'));
  IF OLD.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own admin access'; END IF;
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE role::text='admin' AND id<>OLD.id) THEN RAISE EXCEPTION 'The last admin cannot be removed'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_admin_access BEFORE UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.protect_admin_access();

CREATE OR REPLACE FUNCTION public.guard_category_delete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM products WHERE category_id=OLD.id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Move products to another category before deleting'; END IF;
 UPDATE categories SET parent_id=OLD.parent_id WHERE parent_id=OLD.id;
 RETURN OLD;
END $$;
CREATE TRIGGER guard_category_delete BEFORE DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.guard_category_delete();