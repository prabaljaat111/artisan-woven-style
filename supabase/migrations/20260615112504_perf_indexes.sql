CREATE INDEX IF NOT EXISTS products_published_created_idx
  ON public.products (is_published, created_at DESC)
  WHERE is_published = true;
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments (status);
CREATE INDEX IF NOT EXISTS shipments_created_at_idx ON public.shipments (created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_product_approved_idx
  ON public.reviews (product_id, is_approved);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);
