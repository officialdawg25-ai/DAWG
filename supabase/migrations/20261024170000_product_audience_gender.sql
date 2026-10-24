-- Add explicit storefront audience classification without changing existing catalogue records.
-- Existing products default to unisex until an administrator reviews and classifies them.
alter table public.products
  add column if not exists target_gender text not null default 'unisex';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_target_gender_check'
  ) then
    alter table public.products
      add constraint products_target_gender_check
      check (target_gender in ('men', 'women', 'unisex'));
  end if;
end $$;

create index if not exists products_target_gender_status_published_idx
  on public.products (target_gender, status, published_at desc);
