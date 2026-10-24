-- DAWG storefront hero configuration and media storage.
-- Additive: reuses the existing server-managed public.staff_roles authorization model.

create table if not exists public.storefront_hero (
  id smallint primary key default 1 check (id = 1),
  config jsonb not null,
  published_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storefront_hero_drafts (
  id smallint primary key default 1 check (id = 1),
  config jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.storefront_hero enable row level security;
alter table public.storefront_hero_drafts enable row level security;

drop policy if exists "public reads published storefront hero" on public.storefront_hero;
create policy "public reads published storefront hero"
  on public.storefront_hero for select to anon, authenticated
  using (true);

drop policy if exists "staff publishes storefront hero" on public.storefront_hero;
create policy "staff publishes storefront hero"
  on public.storefront_hero for all to authenticated
  using (exists (
    select 1 from public.staff_roles sr
    where sr.user_id = (select auth.uid())
      and sr.role in ('owner','admin','manager')
  ))
  with check (exists (
    select 1 from public.staff_roles sr
    where sr.user_id = (select auth.uid())
      and sr.role in ('owner','admin','manager')
  ));

drop policy if exists "staff manages storefront hero drafts" on public.storefront_hero_drafts;
create policy "staff manages storefront hero drafts"
  on public.storefront_hero_drafts for all to authenticated
  using (exists (
    select 1 from public.staff_roles sr
    where sr.user_id = (select auth.uid())
      and sr.role in ('owner','admin','manager')
  ))
  with check (exists (
    select 1 from public.staff_roles sr
    where sr.user_id = (select auth.uid())
      and sr.role in ('owner','admin','manager')
  ));

create index if not exists storefront_hero_updated_by_idx on public.storefront_hero(updated_by);
create index if not exists storefront_hero_drafts_updated_by_idx on public.storefront_hero_drafts(updated_by);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dawg-hero-drafts',
  'dawg-hero-drafts',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dawg-hero-public',
  'dawg-hero-public',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload DAWG hero drafts" on storage.objects;
create policy "staff upload DAWG hero drafts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dawg-hero-drafts'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );

drop policy if exists "staff read DAWG hero drafts" on storage.objects;
create policy "staff read DAWG hero drafts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dawg-hero-drafts'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );

drop policy if exists "staff update DAWG hero drafts" on storage.objects;
create policy "staff update DAWG hero drafts"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'dawg-hero-drafts'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  )
  with check (
    bucket_id = 'dawg-hero-drafts'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );

drop policy if exists "staff delete DAWG hero drafts" on storage.objects;
create policy "staff delete DAWG hero drafts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dawg-hero-drafts'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );

drop policy if exists "public read DAWG hero media" on storage.objects;
create policy "public read DAWG hero media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'dawg-hero-public');

drop policy if exists "staff upload DAWG hero media" on storage.objects;
create policy "staff upload DAWG hero media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dawg-hero-public'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );

drop policy if exists "staff update DAWG hero media" on storage.objects;
create policy "staff update DAWG hero media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'dawg-hero-public'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  )
  with check (
    bucket_id = 'dawg-hero-public'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );

drop policy if exists "staff delete DAWG hero media" on storage.objects;
create policy "staff delete DAWG hero media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dawg-hero-public'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid())
        and sr.role in ('owner','admin','manager'))
  );
