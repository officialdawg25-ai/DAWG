-- Give each collection a first-class, admin-managed campaign and story experience.
alter table public.collections
  add column if not exists banner_media_url text,
  add column if not exists banner_headline text,
  add column if not exists banner_subtitle text,
  add column if not exists banner_alignment text not null default 'left',
  add column if not exists story_title text,
  add column if not exists story_content text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.collections'::regclass
      and conname = 'collections_banner_alignment_check'
  ) then
    alter table public.collections
      add constraint collections_banner_alignment_check
      check (banner_alignment in ('left', 'center', 'right'));
  end if;
end $$;

comment on column public.collections.banner_media_url is 'Public image URL used as the collection landing-page campaign banner.';
comment on column public.collections.banner_alignment is 'Alignment of collection banner copy: left, center, or right.';
comment on column public.collections.story_content is 'Admin-authored story copy; separate paragraphs with blank lines.';
