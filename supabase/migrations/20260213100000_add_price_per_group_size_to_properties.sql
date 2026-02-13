alter table public.properties
  add column if not exists price_per_group_size integer;

alter table public.properties
  drop constraint if exists properties_price_per_group_size_positive;

alter table public.properties
  add constraint properties_price_per_group_size_positive
  check (price_per_group_size is null or price_per_group_size >= 1);