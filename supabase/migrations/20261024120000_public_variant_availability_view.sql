-- Do not expose exact inventory counts through the public Data API.
-- Public clients receive only a boolean availability projection; authorised staff retain table access.
create or replace view public.public_product_variants
with (security_barrier = true, security_invoker = false)
as
select
  pv.id,
  pv.product_id,
  pv.size,
  pv.colour,
  pv.sku,
  pv.price_cents,
  (not pv.track_inventory or (pv.stock_on_hand - pv.stock_reserved) > 0) as available,
  pv.status
from public.product_variants pv
join public.products p on p.id = pv.product_id
where pv.status = 'active'
  and p.status = 'active'
  and p.published_at is not null
  and p.published_at <= now();

grant select on public.public_product_variants to anon, authenticated;

drop policy if exists "read published variants or staff" on public.product_variants;
create policy "staff read variants" on public.product_variants for select to authenticated
using (exists (select 1 from public.staff_roles sr where sr.user_id = (select auth.uid()) and sr.role in ('owner','admin','manager')));
