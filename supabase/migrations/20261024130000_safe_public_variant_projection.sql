-- Replace the security-definer view with a safe, RLS-protected availability projection table.
-- The private trigger helper maintains only non-sensitive variant fields and an availability boolean.
drop view if exists public.public_product_variants;

create table if not exists public.public_product_variants (
  id uuid primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  colour text,
  sku text,
  price_cents integer,
  available boolean not null,
  status text not null check (status = 'active')
);
create index if not exists public_product_variants_product_idx on public.public_product_variants(product_id);
alter table public.public_product_variants enable row level security;

drop policy if exists "public read published availability" on public.public_product_variants;
create policy "public read published availability" on public.public_product_variants for select to anon, authenticated
using (exists (
  select 1 from public.products p
  where p.id = product_id
    and p.status = 'active'
    and p.published_at is not null
    and p.published_at <= now()
));

grant select on public.public_product_variants to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.public_product_variants from anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_public_product_variants_for_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  delete from public.public_product_variants where product_id = p_product_id;
  insert into public.public_product_variants (id, product_id, size, colour, sku, price_cents, available, status)
  select
    pv.id,
    pv.product_id,
    pv.size,
    pv.colour,
    pv.sku,
    pv.price_cents,
    (not pv.track_inventory or (pv.stock_on_hand - pv.stock_reserved) > 0),
    'active'
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.product_id = p_product_id
    and pv.status = 'active'
    and p.status = 'active'
    and p.published_at is not null;
end;
$function$;

create or replace function private.sync_public_variants_after_variant_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'DELETE' then
    perform private.sync_public_product_variants_for_product(old.product_id);
    return old;
  end if;
  perform private.sync_public_product_variants_for_product(new.product_id);
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform private.sync_public_product_variants_for_product(old.product_id);
  end if;
  return new;
end;
$function$;

create or replace function private.sync_public_variants_after_product_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  perform private.sync_public_product_variants_for_product(new.id);
  return new;
end;
$function$;

revoke all on function private.sync_public_product_variants_for_product(uuid) from public, anon, authenticated, service_role;
revoke all on function private.sync_public_variants_after_variant_change() from public, anon, authenticated, service_role;
revoke all on function private.sync_public_variants_after_product_change() from public, anon, authenticated, service_role;

drop trigger if exists sync_public_variants_after_variant_change on public.product_variants;
create trigger sync_public_variants_after_variant_change
after insert or update or delete on public.product_variants
for each row execute function private.sync_public_variants_after_variant_change();

drop trigger if exists sync_public_variants_after_product_change on public.products;
create trigger sync_public_variants_after_product_change
after insert or update of status, published_at on public.products
for each row execute function private.sync_public_variants_after_product_change();

-- Rebuild the safe projection from the current catalogue after trigger installation.
do $function$
declare r record;
begin
  for r in select id from public.products loop
    perform private.sync_public_product_variants_for_product(r.id);
  end loop;
end;
$function$;
