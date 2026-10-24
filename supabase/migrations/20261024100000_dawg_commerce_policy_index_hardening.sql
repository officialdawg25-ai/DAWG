-- DAWG commerce policy/index hardening. Additive policy replacement only.
-- Keep public catalogue reads and staff writes explicit to reduce permissive-policy overlap.

create index if not exists audit_logs_actor_user_idx on public.audit_logs(actor_user_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_items_variant_idx on public.order_items(variant_id);
create index if not exists order_status_events_actor_idx on public.order_status_events(actor_user_id);
create index if not exists product_media_product_idx on public.product_media(product_id);
create index if not exists staff_roles_created_by_idx on public.staff_roles(created_by);
create index if not exists store_settings_updated_by_idx on public.store_settings(updated_by);

-- Collections: one SELECT policy for public and staff; separate write policies.
drop policy if exists "public read active collections" on public.collections;
drop policy if exists "staff manage collections" on public.collections;
create policy "read active collections or staff" on public.collections for select to anon, authenticated
using (status = 'active' or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff insert collections" on public.collections for insert to authenticated
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff update collections" on public.collections for update to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff delete collections" on public.collections for delete to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

-- Products.
drop policy if exists "public read published products" on public.products;
drop policy if exists "staff manage products" on public.products;
create policy "read published products or staff" on public.products for select to anon, authenticated
using ((status = 'active' and published_at is not null and published_at <= now()) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff insert products" on public.products for insert to authenticated
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff update products" on public.products for update to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff delete products" on public.products for delete to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

-- Product variants and media follow the visibility of their parent product for public reads.
drop policy if exists "public read variants of published products" on public.product_variants;
drop policy if exists "staff manage variants" on public.product_variants;
create policy "read published variants or staff" on public.product_variants for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and ((p.status = 'active' and p.published_at is not null and p.published_at <= now()) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))));
create policy "staff insert variants" on public.product_variants for insert to authenticated
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff update variants" on public.product_variants for update to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff delete variants" on public.product_variants for delete to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

drop policy if exists "public read media of published products" on public.product_media;
drop policy if exists "staff manage product media" on public.product_media;
create policy "read published media or staff" on public.product_media for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and ((p.status = 'active' and p.published_at is not null and p.published_at <= now()) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))));
create policy "staff insert product media" on public.product_media for insert to authenticated
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff update product media" on public.product_media for update to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff delete product media" on public.product_media for delete to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

-- Discounts.
drop policy if exists "public read active discounts" on public.discounts;
drop policy if exists "staff manage discounts" on public.discounts;
create policy "read active discounts or staff" on public.discounts for select to anon, authenticated
using ((active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff insert discounts" on public.discounts for insert to authenticated
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff update discounts" on public.discounts for update to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')))
with check (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
create policy "staff delete discounts" on public.discounts for delete to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));

-- Orders: customers can read their own orders; approved staff can read operational orders.
drop policy if exists "customer reads own orders" on public.orders;
drop policy if exists "staff reads orders" on public.orders;
create policy "customer or staff reads orders" on public.orders for select to authenticated
using (customer_id = (select auth.uid()) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment','support')));

drop policy if exists "customer reads own order items" on public.order_items;
drop policy if exists "staff reads order items" on public.order_items;
create policy "customer or staff reads order items" on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment','support')))));

drop policy if exists "customer reads own order events" on public.order_status_events;
drop policy if exists "staff reads order events" on public.order_status_events;
create policy "customer or staff reads order events" on public.order_status_events for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager','fulfilment','support')))));
