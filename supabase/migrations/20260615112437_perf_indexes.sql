-- Speed up storefront product listing (is_published filter + created_at order)
CREATE INDEX IF NOT EXISTS products_published_created_idx
  ON public.products (is_published, created_at DESC)
  WHERE is_published = true;

-- Speed up admin shipments filtering
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments (status);
CREATE INDEX IF NOT EXISTS shipments_created_at_idx ON public.shipments (created_at DESC);

-- Speed up reviews lookups by product when filtering published
CREATE INDEX IF NOT EXISTS reviews_product_published_idx
  ON public.reviews (product_id, is_published);

-- Order items lookups
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);
