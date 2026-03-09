create table if not exists public.admin_fx_rates (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null unique,
  rate_to_rwf numeric(18, 6) not null check (rate_to_rwf > 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

create or replace function public.set_admin_fx_rates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_fx_rates_updated_at on public.admin_fx_rates;
create trigger trg_admin_fx_rates_updated_at
before update on public.admin_fx_rates
for each row
execute function public.set_admin_fx_rates_updated_at();

insert into public.admin_fx_rates (currency_code, rate_to_rwf, is_active)
values
  ('USD', 1455.5, true),
  ('EUR', 1716.76225, true),
  ('GBP', 1972.4936, true),
  ('CNY', 209.732456, true),
  ('KES', 11.283036, true),
  ('UGX', 0.408996, true),
  ('TZS', 0.563279, true),
  ('AED', 396.323917, true)
on conflict (currency_code) do update
set
  rate_to_rwf = excluded.rate_to_rwf,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.admin_fx_rates enable row level security;

drop policy if exists "Admin fx rates readable by authenticated users" on public.admin_fx_rates;
create policy "Admin fx rates readable by authenticated users"
on public.admin_fx_rates
for select
to authenticated
using (true);

drop policy if exists "Admins can manage fx rates" on public.admin_fx_rates;
create policy "Admins can manage fx rates"
on public.admin_fx_rates
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);
