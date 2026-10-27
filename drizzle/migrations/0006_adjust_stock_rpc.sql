ALTER TABLE public.stock_logs ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS variation_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _variation_id uuid, _type text, _quantity integer, _reason text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prev integer; nxt integer; reorder integer; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_team_member(uid) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _type NOT IN ('add','reduce','set') THEN RAISE EXCEPTION 'Invalid adjustment type'; END IF;
  IF _quantity IS NULL OR _quantity < 0 OR _quantity > 1000000 THEN RAISE EXCEPTION 'Quantity must be between 0 and 1,000,000'; END IF;
  IF _type <> 'set' AND _quantity = 0 THEN RAISE EXCEPTION 'Quantity must be more than 0'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 OR length(_reason) > 60 THEN RAISE EXCEPTION 'Reason is required'; END IF;
  IF _notes IS NOT NULL AND length(_notes) > 500 THEN RAISE EXCEPTION 'Notes too long'; END IF;

  SELECT COALESCE(reorder_level, 5) INTO reorder FROM products WHERE id = _product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  IF _variation_id IS NOT NULL THEN
    SELECT stock INTO prev FROM product_variants WHERE id = _variation_id AND product_id = _product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variation not found'; END IF;
  ELSE
    SELECT stock INTO prev FROM products WHERE id = _product_id;
  END IF;
  prev := COALESCE(prev, 0);
  nxt := CASE _type WHEN 'add' THEN prev + _quantity WHEN 'reduce' THEN prev - _quantity ELSE _quantity END;
  IF nxt < 0 THEN RAISE EXCEPTION 'Stock cannot go below 0 (current stock is %)', prev; END IF;

  IF _variation_id IS NOT NULL THEN
    UPDATE product_variants SET stock = nxt, updated_at = now() WHERE id = _variation_id;
    IF nxt <= reorder AND prev > reorder OR (nxt = 0 AND prev > 0) THEN
      INSERT INTO stock_alerts (product_id, variation_id, level, stock_at_alert) VALUES (_product_id, _variation_id, CASE WHEN nxt = 0 THEN 'out' ELSE 'low' END, nxt);
    END IF;
  ELSE
    UPDATE products SET stock = nxt, updated_at = now() WHERE id = _product_id; -- products_stock_alert trigger raises alerts
  END IF;

  INSERT INTO stock_logs (product_id, variation_id, adjustment_type, quantity, previous_stock, new_stock, reason, notes, user_id)
  VALUES (_product_id, _variation_id, _type, abs(nxt - prev), prev, nxt, trim(_reason), NULLIF(trim(COALESCE(_notes,'')), ''), uid);

  RETURN jsonb_build_object('previous', prev, 'new', nxt, 'low', nxt <= reorder);
END $$;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, uuid, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, text, integer, text, text) TO authenticated;