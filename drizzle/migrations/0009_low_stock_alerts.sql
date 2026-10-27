ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS reorder_level integer;
ALTER TABLE public.products ALTER COLUMN reorder_level SET DEFAULT 10;

-- product-level alerts: use reorder level, skip products whose stock comes from variations
CREATE OR REPLACE FUNCTION public.emit_stock_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE threshold integer;
BEGIN
  IF NOT COALESCE(NEW.track_inventory, true) OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM product_variants WHERE product_id = NEW.id) THEN RETURN NEW; END IF;
  threshold := COALESCE(NEW.reorder_level, NEW.low_stock_threshold, 10);
  IF NEW.stock <= 0 AND COALESCE(OLD.stock, 1) > 0 THEN
    INSERT INTO stock_alerts (product_id, level, stock_at_alert) VALUES (NEW.id, 'out', NEW.stock);
  ELSIF NEW.stock > 0 AND NEW.stock <= threshold AND COALESCE(OLD.stock, threshold + 1) > threshold THEN
    INSERT INTO stock_alerts (product_id, level, stock_at_alert) VALUES (NEW.id, 'low', NEW.stock);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.emit_variant_stock_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE threshold integer;
BEGIN
  SELECT COALESCE(NEW.reorder_level, p.reorder_level, 10) INTO threshold FROM products p WHERE p.id = NEW.product_id AND p.deleted_at IS NULL AND COALESCE(p.track_inventory, true);
  IF threshold IS NULL OR NEW.status = 'inactive' THEN RETURN NEW; END IF;
  IF NEW.stock <= 0 AND COALESCE(OLD.stock, 1) > 0 THEN
    INSERT INTO stock_alerts (product_id, variation_id, level, stock_at_alert) VALUES (NEW.product_id, NEW.id, 'out', NEW.stock);
  ELSIF NEW.stock > 0 AND NEW.stock <= threshold AND COALESCE(OLD.stock, threshold + 1) > threshold THEN
    INSERT INTO stock_alerts (product_id, variation_id, level, stock_at_alert) VALUES (NEW.product_id, NEW.id, 'low', NEW.stock);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER variants_stock_alert AFTER UPDATE OF stock ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.emit_variant_stock_alert();

-- every new alert notifies admins and managers in-app
CREATE OR REPLACE FUNCTION public.notify_stock_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pname text; vlabel text;
BEGIN
  SELECT name INTO pname FROM products WHERE id = NEW.product_id;
  IF NEW.variation_id IS NOT NULL THEN SELECT concat_ws(' / ', size, color) INTO vlabel FROM product_variants WHERE id = NEW.variation_id; END IF;
  INSERT INTO notifications (user_id, title, body, link, kind)
  SELECT DISTINCT r.user_id,
    CASE WHEN NEW.level = 'out' THEN 'Out of stock: ' ELSE 'Low stock: ' END || COALESCE(pname, 'Product') || COALESCE(' (' || NULLIF(vlabel,'') || ')', ''),
    'Only ' || NEW.stock_at_alert || ' left. Restock soon.', '/admin/low-stock', CASE WHEN NEW.level = 'out' THEN 'error' ELSE 'warning' END
  FROM user_roles r WHERE r.role::text IN ('admin','manager');
  RETURN NEW;
END $$;
CREATE TRIGGER stock_alerts_notify AFTER INSERT ON public.stock_alerts FOR EACH ROW EXECUTE FUNCTION public.notify_stock_alert();

-- adjust_stock no longer inserts alerts itself (triggers do), and respects variation reorder level
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _variation_id uuid, _type text, _quantity integer, _reason text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev integer; nxt integer; reorder integer; vreorder integer; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_team_member(uid) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _type NOT IN ('add','reduce','set') THEN RAISE EXCEPTION 'Invalid adjustment type'; END IF;
  IF _quantity IS NULL OR _quantity < 0 OR _quantity > 1000000 THEN RAISE EXCEPTION 'Quantity must be between 0 and 1,000,000'; END IF;
  IF _type <> 'set' AND _quantity = 0 THEN RAISE EXCEPTION 'Quantity must be more than 0'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 OR length(_reason) > 60 THEN RAISE EXCEPTION 'Reason is required'; END IF;
  IF _notes IS NOT NULL AND length(_notes) > 500 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  SELECT COALESCE(reorder_level, 10) INTO reorder FROM products WHERE id = _product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF _variation_id IS NOT NULL THEN
    SELECT stock, reorder_level INTO prev, vreorder FROM product_variants WHERE id = _variation_id AND product_id = _product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variation not found'; END IF;
    reorder := COALESCE(vreorder, reorder);
  ELSE
    SELECT stock INTO prev FROM products WHERE id = _product_id;
  END IF;
  prev := COALESCE(prev, 0);
  nxt := CASE _type WHEN 'add' THEN prev + _quantity WHEN 'reduce' THEN prev - _quantity ELSE _quantity END;
  IF nxt < 0 THEN RAISE EXCEPTION 'Stock cannot go below 0 (current stock is %)', prev; END IF;
  IF _variation_id IS NOT NULL THEN
    UPDATE product_variants SET stock = nxt, updated_at = now() WHERE id = _variation_id;
  ELSE
    UPDATE products SET stock = nxt, updated_at = now() WHERE id = _product_id;
  END IF;
  INSERT INTO stock_logs (product_id, variation_id, adjustment_type, quantity, previous_stock, new_stock, reason, notes, user_id)
  VALUES (_product_id, _variation_id, _type, abs(nxt - prev), prev, nxt, trim(_reason), NULLIF(trim(COALESCE(_notes,'')), ''), uid);
  RETURN jsonb_build_object('previous', prev, 'new', nxt, 'low', nxt <= reorder);
END $$;

-- one row per stock-keeping item at or below its reorder level
CREATE OR REPLACE FUNCTION public.low_stock_items()
RETURNS TABLE(product_id uuid, variation_id uuid, name text, image text, sku text, size text, color text, stock integer, reorder_level integer, category text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, v.id, p.name, COALESCE(NULLIF(v.image_url,''), p.images[1]), COALESCE(v.sku, p.sku), v.size, v.color, v.stock,
         COALESCE(v.reorder_level, p.reorder_level, 10), c.name
  FROM products p JOIN product_variants v ON v.product_id = p.id LEFT JOIN categories c ON c.id = p.category_id
  WHERE public.is_team_member(auth.uid()) AND p.deleted_at IS NULL AND COALESCE(p.track_inventory, true) AND v.status <> 'inactive'
    AND v.stock <= COALESCE(v.reorder_level, p.reorder_level, 10)
  UNION ALL
  SELECT p.id, NULL, p.name, p.images[1], p.sku, NULL, NULL, p.stock, COALESCE(p.reorder_level, 10), c.name
  FROM products p LEFT JOIN categories c ON c.id = p.category_id
  WHERE public.is_team_member(auth.uid()) AND p.deleted_at IS NULL AND COALESCE(p.track_inventory, true)
    AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
    AND p.stock <= COALESCE(p.reorder_level, 10)
$$;
REVOKE ALL ON FUNCTION public.low_stock_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.low_stock_items() TO authenticated;

-- stock alerts readable by the whole team
CREATE POLICY "team reads stock alerts" ON public.stock_alerts FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));