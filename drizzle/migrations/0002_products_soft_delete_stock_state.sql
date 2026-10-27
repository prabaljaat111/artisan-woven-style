ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_state text GENERATED ALWAYS AS (
  CASE WHEN stock <= 0 THEN 'out' WHEN stock <= reorder_level THEN 'low' ELSE 'ok' END
) STORED;
CREATE INDEX IF NOT EXISTS products_admin_list_idx ON public.products (deleted_at, created_at DESC);