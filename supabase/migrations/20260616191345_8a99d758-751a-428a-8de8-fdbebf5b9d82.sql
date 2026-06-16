
-- Broaden the public insert policy on leads so contact, newsletter/subscribe,
-- exit-intent, support and inquiry forms can all submit. Allow short notes.
DROP POLICY IF EXISTS "anyone can submit a valid lead" ON public.leads;

CREATE POLICY "anyone can submit a valid lead"
ON public.leads
FOR INSERT
TO public
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 80
  AND char_length(btrim(phone)) BETWEEN 3 AND 60
  AND (whatsapp IS NULL OR char_length(whatsapp) BETWEEN 3 AND 60)
  AND (interest IS NULL OR char_length(interest) <= 120)
  AND (category IS NULL OR char_length(category) <= 60)
  AND (occasion IS NULL OR char_length(occasion) <= 60)
  AND (budget   IS NULL OR char_length(budget)   <= 60)
  AND (page_url IS NULL OR char_length(page_url) <= 500)
  AND (notes    IS NULL OR char_length(notes)    <= 4000)
  AND source = ANY (ARRAY[
    'chat','contact_form','contact','callback','stylist','website',
    'newsletter','newsletter+whatsapp','subscribe',
    'exit_intent','support','inquiry','enquiry','popup','footer'
  ])
  AND char_length(source) <= 40
  AND status = 'new'
  AND jsonb_typeof(conversation) = 'array'
  AND pg_column_size(conversation) <= 65536
);
