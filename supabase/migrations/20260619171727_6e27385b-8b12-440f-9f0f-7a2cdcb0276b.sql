ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill from existing single color
UPDATE public.products
SET colors = ARRAY[color]
WHERE color IS NOT NULL AND color <> '' AND (colors IS NULL OR array_length(colors, 1) IS NULL);