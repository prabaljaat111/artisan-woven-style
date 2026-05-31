
-- Drop the broad SELECT policy. Public bucket still allows direct URL access via CDN.
drop policy if exists "Public read product images" on storage.objects;
