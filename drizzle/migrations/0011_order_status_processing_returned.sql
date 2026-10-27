ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';