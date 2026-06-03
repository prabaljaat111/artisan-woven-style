-- Replace the permissive insert policy with one that validates each field
DROP POLICY IF EXISTS "anyone can submit a lead" ON public.leads;

CREATE POLICY "anyone can submit a valid lead"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(name)) BETWEEN 1 AND 80
    AND char_length(trim(phone)) BETWEEN 6 AND 24
    AND (whatsapp IS NULL OR char_length(whatsapp) BETWEEN 6 AND 24)
    AND (interest IS NULL OR char_length(interest) <= 60)
    AND (category IS NULL OR char_length(category) <= 60)
    AND (occasion IS NULL OR char_length(occasion) <= 60)
    AND (budget IS NULL OR char_length(budget) <= 60)
    AND (page_url IS NULL OR char_length(page_url) <= 500)
    AND char_length(source) <= 40
    AND (notes IS NULL OR char_length(notes) <= 2000)
    AND jsonb_typeof(conversation) = 'array'
    AND pg_column_size(conversation) <= 65536
  );