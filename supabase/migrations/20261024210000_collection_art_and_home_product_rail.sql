alter table public.collections
  add column if not exists art_media_url text,
  add column if not exists art_media_type text;

alter table public.collections
  drop constraint if exists collections_art_media_type_check;

alter table public.collections
  add constraint collections_art_media_type_check
  check (art_media_type is null or art_media_type in ('image', 'video'));

comment on column public.collections.art_media_url is
  'Public storefront art media URL; falls back to banner_media_url when null.';
comment on column public.collections.art_media_type is
  'Collection art media kind: image or video. Null means no dedicated art is configured.';

-- Dedicated public-read media bucket; only authorised DAWG staff may upload or mutate objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'collection-art-media',
  'collection-art-media',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read DAWG collection art" on storage.objects;
create policy "public read DAWG collection art"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'collection-art-media');

drop policy if exists "staff upload DAWG collection art" on storage.objects;
create policy "staff upload DAWG collection art"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'collection-art-media'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role = any (array['owner','admin','manager'])
    )
  );

drop policy if exists "staff update DAWG collection art" on storage.objects;
create policy "staff update DAWG collection art"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'collection-art-media'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role = any (array['owner','admin','manager'])
    )
  )
  with check (
    bucket_id = 'collection-art-media'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role = any (array['owner','admin','manager'])
    )
  );

drop policy if exists "staff delete DAWG collection art" on storage.objects;
create policy "staff delete DAWG collection art"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'collection-art-media'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role = any (array['owner','admin','manager'])
    )
  );
