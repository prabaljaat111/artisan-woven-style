CREATE OR REPLACE FUNCTION public.create_checkout_order(_order jsonb, _items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE saved public.orders; item jsonb;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Server checkout access required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_order) <> 'object' OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid checkout data'; END IF;
 INSERT INTO public.orders(user_id,customer_name,customer_email,customer_phone,shipping_address,subtotal,gst,shipping,discount,total,coupon_code,payment_method,status,payment_status)
 SELECT r.user_id,r.customer_name,r.customer_email,r.customer_phone,r.shipping_address,r.subtotal,r.gst,r.shipping,r.discount,r.total,r.coupon_code,r.payment_method,'pending','unpaid' FROM jsonb_populate_record(NULL::public.orders,_order) r RETURNING * INTO saved;
 FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
  INSERT INTO public.order_items(order_id,product_id,product_name,product_slug,image,size,color,qty,price)
  SELECT saved.id,r.product_id,r.product_name,r.product_slug,r.image,r.size,r.color,r.qty,r.price FROM jsonb_populate_record(NULL::public.order_items,item) r;
 END LOOP;
 IF saved.coupon_code IS NOT NULL THEN PERFORM public.claim_order_coupon(saved.id,saved.user_id); END IF;
 RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb,jsonb) TO service_role;