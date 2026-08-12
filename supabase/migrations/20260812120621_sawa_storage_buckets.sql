-- SAWA marketplace — storage buckets
--
-- Path conventions are load-bearing: every policy below authorises by reading
-- the first folder segment of the object name.
--
--   listing-images/{listing_id}/{uuid}.webp
--   avatars/{user_id}/{uuid}.webp
--   dispute-evidence/{order_id}/{uuid}.{ext}
--
-- Buckets are created idempotently so the migration is safe to re-run against
-- a project where someone already made them by hand in the dashboard.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  -- private: evidence in a dispute is between the parties and staff
  ('dispute-evidence', 'dispute-evidence', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────── listing-images ───────────────────────────
-- Public bucket, so reads need no policy on storage.objects for anon access
-- via the public URL. The read policy below is what lets the authenticated
-- client list and sign objects.

create policy listing_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-images');

create policy listing_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and public.owns_listing(((storage.foldername(name))[1])::uuid)
  );

create policy listing_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-images'
    and public.owns_listing(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'listing-images'
    and public.owns_listing(((storage.foldername(name))[1])::uuid)
  );

create policy listing_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and public.owns_listing(((storage.foldername(name))[1])::uuid)
  );

-- ─────────────────────────────── avatars ───────────────────────────────

create policy avatars_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ─────────────────────────── dispute-evidence ───────────────────────────
-- Private. Only the buyer and seller on that order can read or add to it,
-- and nobody can delete — evidence is append-only by design.

create policy dispute_evidence_read_party on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and public.is_order_party(((storage.foldername(name))[1])::uuid)
  );

create policy dispute_evidence_insert_party on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dispute-evidence'
    and public.is_order_party(((storage.foldername(name))[1])::uuid)
  );
