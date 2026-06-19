ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS care_instructions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS shipping_info text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS return_policy text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS authenticity text;

COMMENT ON COLUMN public.products.specifications IS 'Product-specific specification key/value data. Must only describe this product.';
COMMENT ON COLUMN public.products.attributes IS 'Additional product-specific attributes. Must only describe this product.';
COMMENT ON COLUMN public.products.care_instructions IS 'Product-specific care instruction list.';
COMMENT ON COLUMN public.products.shipping_info IS 'Product-specific shipping information list.';
COMMENT ON COLUMN public.products.return_policy IS 'Product-specific return policy list.';
COMMENT ON COLUMN public.products.authenticity IS 'Product-specific authenticity note.';