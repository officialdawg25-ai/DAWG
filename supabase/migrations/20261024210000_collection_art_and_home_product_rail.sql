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
