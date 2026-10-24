alter table public.products add column if not exists has_variants boolean not null default false;
comment on column public.products.has_variants is 'Whether the product requires a selectable variant; stored separately so public clients do not infer simple products from hidden inventory rows.';
