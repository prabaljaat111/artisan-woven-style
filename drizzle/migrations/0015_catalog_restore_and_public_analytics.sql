GRANT SELECT ON public.app_settings TO anon;
CREATE POLICY "public analytics identifiers" ON public.app_settings FOR SELECT TO anon USING (key='analytics');
CREATE OR REPLACE FUNCTION public.restore_catalog_backup(_tables jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; r jsonb; cols text; vals text; updates text; keycol text; total integer:=0;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF jsonb_typeof(_tables)<>'object' THEN RAISE EXCEPTION 'Invalid backup'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_tables) k WHERE NOT k=ANY(ARRAY['categories','brands','attributes','attribute_values','products','product_variants','coupons','app_settings'])) THEN RAISE EXCEPTION 'Unsupported backup table'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('ihs-catalog-restore'));
 FOREACH t IN ARRAY ARRAY['categories','brands','attributes','attribute_values','products','product_variants','coupons','app_settings'] LOOP
  IF NOT _tables ? t THEN CONTINUE; END IF;
  IF jsonb_typeof(_tables->t)<>'array' OR jsonb_array_length(_tables->t)>10000 THEN RAISE EXCEPTION 'Invalid or oversized backup table'; END IF;
  keycol:=CASE WHEN t='app_settings' THEN 'key' ELSE 'id' END;
  FOR r IN SELECT * FROM jsonb_array_elements(_tables->t) LOOP
   IF NULLIF(r->>keycol,'') IS NULL THEN RAISE EXCEPTION 'Missing record identifier'; END IF;
   SELECT string_agg(format('%I',c.column_name),', '),string_agg(format('r.%I',c.column_name),', '),string_agg(format('%I=EXCLUDED.%I',c.column_name,c.column_name),', ') FILTER(WHERE c.column_name<>keycol) INTO cols,vals,updates FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=t AND c.is_generated='NEVER' AND r ? c.column_name;
   EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r ON CONFLICT (%I) DO UPDATE SET %s',t,cols,vals,t,keycol,updates) USING r;
   total:=total+1;
  END LOOP;
 END LOOP;
 RETURN jsonb_build_object('restored',total);
END $$;
REVOKE ALL ON FUNCTION public.restore_catalog_backup(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_catalog_backup(jsonb) TO authenticated;