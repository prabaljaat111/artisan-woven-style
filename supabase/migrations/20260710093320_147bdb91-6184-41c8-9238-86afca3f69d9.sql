
-- Fix: leads notes bypass — force notes to be NULL for anon submissions
DROP POLICY IF EXISTS "anyone can submit a valid lead" ON public.leads;
CREATE POLICY "anyone can submit a valid lead" ON public.leads
FOR INSERT
WITH CHECK (
  (char_length(btrim(name)) BETWEEN 1 AND 80)
  AND (char_length(btrim(phone)) BETWEEN 3 AND 60)
  AND (whatsapp IS NULL OR char_length(whatsapp) BETWEEN 3 AND 60)
  AND (interest IS NULL OR char_length(interest) <= 120)
  AND (category IS NULL OR char_length(category) <= 60)
  AND (occasion IS NULL OR char_length(occasion) <= 60)
  AND (budget IS NULL OR char_length(budget) <= 60)
  AND (page_url IS NULL OR char_length(page_url) <= 500)
  AND notes IS NULL
  AND source = ANY (ARRAY['chat','contact_form','contact','callback','stylist','website','newsletter','newsletter+whatsapp','subscribe','exit_intent','support','inquiry','enquiry','popup','footer'])
  AND char_length(source) <= 40
  AND status = 'new'
  AND jsonb_typeof(conversation) = 'array'
  AND pg_column_size(conversation) <= 65536
);

-- Fix: order_items guest-order hijack — restrict guest inserts to anon role only,
-- and authenticated users can only insert items into their own orders.
DROP POLICY IF EXISTS "items insert for own or guest order" ON public.order_items;

CREATE POLICY "items insert for own order" ON public.order_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
      AND o.created_at > (now() - interval '10 minutes')
  )
);

CREATE POLICY "items insert for guest order" ON public.order_items
FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id IS NULL
      AND o.created_at > (now() - interval '10 minutes')
  )
);
