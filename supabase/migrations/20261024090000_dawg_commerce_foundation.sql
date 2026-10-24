-- DAWG Clothing commerce foundation. Additive only; does not delete or rewrite existing data.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','fulfilment','support')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (user_id, role)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  image_url text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  collection_id uuid references public.collections(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= 0),
  currency char(3) not null default 'ZAR',
  image_url text,
  sku text,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_sku_unique on public.products(sku) where sku is not null and sku <> '';
create index if not exists products_public_listing_idx on public.products(status, published_at desc, created_at desc);
create index if not exists products_collection_idx on public.products(collection_id);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  colour text,
  sku text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0 and stock_reserved <= stock_on_hand),
  track_inventory boolean not null default true,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists product_variants_sku_unique on public.product_variants(sku) where sku is not null and sku <> '';
create index if not exists product_variants_product_idx on public.product_variants(product_id);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text,
  postal_code text,
  country_code char(2) not null default 'ZA',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null,
  currency char(3) not null default 'ZAR',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending','processing','paid','failed','cancelled','expired','partially_refunded','refunded')),
  fulfilment_status text not null default 'unfulfilled' check (fulfilment_status in ('unfulfilled','processing','fulfilled','shipped','delivered','cancelled','returned')),
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb,
  shipping_method text,
  tracking_number text,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status, created_at desc);
create index if not exists orders_fulfilment_status_idx on public.orders(fulfilment_status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text,
  variant_label text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_status_events(order_id, created_at);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed_amount','free_shipping')),
  amount integer not null default 0 check (amount >= 0),
  currency char(3) not null default 'ZAR',
  minimum_subtotal_cents integer not null default 0 check (minimum_subtotal_cents >= 0),
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

do $$ declare t text; begin
  foreach t in array array['profiles','collections','products','product_variants','customer_addresses','orders','discounts','store_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.discounts enable row level security;
alter table public.store_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Authorization is based on server-managed staff_roles, never user-editable auth metadata.
drop policy if exists "profile owner read" on public.profiles;
create policy "profile owner read" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile owner insert" on public.profiles;
create policy "profile owner insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "staff can read own role" on public.staff_roles;
create policy "staff can read own role" on public.staff_roles for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "public read active collections" on public.collections;
create policy "public read active collections" on public.collections for select to anon, authenticated using (status = 'active');
drop policy if exists "staff manage collections" on public.collections;
create policy "staff manage collections" on public.collections for all to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select to anon, authenticated using (status = 'active' and published_at is not null and published_at <= now());
drop policy if exists "staff manage products" on public.products;
create policy "staff manage products" on public.products for all to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

drop policy if exists "public read variants of published products" on public.product_variants;
create policy "public read variants of published products" on public.product_variants for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active' and p.published_at is not null and p.published_at <= now()));
drop policy if exists "staff manage variants" on public.product_variants;
create policy "staff manage variants" on public.product_variants for all to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

drop policy if exists "public read media of published products" on public.product_media;
create policy "public read media of published products" on public.product_media for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active' and p.published_at is not null and p.published_at <= now()));
drop policy if exists "staff manage product media" on public.product_media;
create policy "staff manage product media" on public.product_media for all to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

drop policy if exists "customer manages own addresses" on public.customer_addresses;
create policy "customer manages own addresses" on public.customer_addresses for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "customer reads own orders" on public.orders;
create policy "customer reads own orders" on public.orders for select to authenticated using (customer_id = (select auth.uid()));
drop policy if exists "staff reads orders" on public.orders;
create policy "staff reads orders" on public.orders for select to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment','support')));
drop policy if exists "customer reads own order items" on public.order_items;
create policy "customer reads own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
drop policy if exists "staff reads order items" on public.order_items;
create policy "staff reads order items" on public.order_items for select to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment','support')));
drop policy if exists "customer reads own order events" on public.order_status_events;
create policy "customer reads own order events" on public.order_status_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
drop policy if exists "staff reads order events" on public.order_status_events;
create policy "staff reads order events" on public.order_status_events for select to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment','support')));
drop policy if exists "staff creates order events" on public.order_status_events;
create policy "staff creates order events" on public.order_status_events for insert to authenticated with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment')));

drop policy if exists "public read active discounts" on public.discounts;
create policy "public read active discounts" on public.discounts for select to anon, authenticated using (active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
drop policy if exists "staff manage discounts" on public.discounts;
create policy "staff manage discounts" on public.discounts for all to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager'))) with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

drop policy if exists "staff manage settings" on public.store_settings;
create policy "staff manage settings" on public.store_settings for all to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager'))) with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
drop policy if exists "staff read audit logs" on public.audit_logs;
create policy "staff read audit logs" on public.audit_logs for select to authenticated using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
-- The storage bucket is public-read for published product imagery; writes remain staff-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read DAWG product media" on storage.objects;
create policy "public read DAWG product media" on storage.objects for select to anon, authenticated using (bucket_id = 'product-media');
drop policy if exists "staff upload DAWG product media" on storage.objects;
create policy "staff upload DAWG product media" on storage.objects for insert to authenticated with check (bucket_id = 'product-media' and exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
drop policy if exists "staff update DAWG product media" on storage.objects;
create policy "staff update DAWG product media" on storage.objects for update to authenticated using (bucket_id = 'product-media' and exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager'))) with check (bucket_id = 'product-media' and exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
drop policy if exists "staff delete DAWG product media" on storage.objects;
create policy "staff delete DAWG product media" on storage.objects for delete to authenticated using (bucket_id = 'product-media' and exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

insert into public.collections (slug, name, description, status, sort_order)
values
  ('kenn','KENN','Foundation, identity, presence and earned status.','active',1),
  ('grit','GRIT','Discipline, resilience and consistency.','active',2),
  ('ivy','IVY','Knowledge, strategic thinking and elite performance.','active',3),
  ('roam','ROAM','Freedom, movement and exploration.','active',4),
  ('howl','HOWL','Instinct, individuality and independent expression.','active',5)
on conflict (slug) do nothing;

-- No direct client insert/update policy exists for orders, order_items, payment state, or audit records.
-- A trusted server-side checkout/payment integration must be added before accepting orders.
