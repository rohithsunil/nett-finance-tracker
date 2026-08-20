-- Nett 1.18: parity fields for the focused Base44-compatible product model.
-- This migration is additive. Existing records are classified, never deleted.

alter table public.profiles
  add column if not exists count_owed_to_me boolean not null default false,
  add column if not exists enabled_countries jsonb not null default '["AE", "IN"]'::jsonb,
  add column if not exists enabled_currencies jsonb not null default '["AED", "INR"]'::jsonb;

alter table public.accounts
  add column if not exists ownership_type text not null default 'personal';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_ownership_type_check') then
    alter table public.accounts add constraint accounts_ownership_type_check check (ownership_type in ('personal', 'business'));
  end if;
end $$;

alter table public.spaces
  add column if not exists kind text not null default 'spend',
  add column if not exists tracker_type text,
  add column if not exists country_code text;

update public.spaces
set kind = case when notes like 'nett_pot_metadata:%' then 'pot' else 'spend' end
where kind is null or kind not in ('pot', 'spend');

update public.spaces
set kind = 'pot'
where notes like 'nett_pot_metadata:%';

update public.spaces
set tracker_type = coalesce(tracker_type, 'cost')
where kind = 'spend';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'spaces_kind_check') then
    alter table public.spaces add constraint spaces_kind_check check (kind in ('pot', 'spend'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'spaces_tracker_type_check') then
    alter table public.spaces add constraint spaces_tracker_type_check check (tracker_type is null or tracker_type in ('cost', 'business', 'trip'));
  end if;
end $$;

alter table public.commitments
  add column if not exists category text,
  add column if not exists active boolean not null default true,
  add column if not exists day_of_month integer,
  add column if not exists entry_type text not null default 'bill';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commitments_day_of_month_check') then
    alter table public.commitments add constraint commitments_day_of_month_check check (day_of_month is null or day_of_month between 1 and 31);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'commitments_entry_type_check') then
    alter table public.commitments add constraint commitments_entry_type_check check (entry_type in ('bill', 'recurring'));
  end if;
end $$;

alter table public.budget_lines
  add column if not exists is_template boolean not null default true;

alter table public.forecast_scenarios
  add column if not exists recurrence text not null default 'one_time',
  add column if not exists duration_months integer,
  add column if not exists active boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'forecast_scenarios_recurrence_check') then
    alter table public.forecast_scenarios add constraint forecast_scenarios_recurrence_check check (recurrence in ('one_time', 'recurring'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'forecast_scenarios_duration_check') then
    alter table public.forecast_scenarios add constraint forecast_scenarios_duration_check check (duration_months is null or duration_months between 1 and 120);
  end if;
end $$;

alter table public.investments
  add column if not exists market text;

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, code)
);

create index if not exists countries_user_sort_idx on public.countries(user_id, sort_order, name);
alter table public.countries enable row level security;
drop policy if exists owner_all on public.countries;
create policy owner_all on public.countries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_updated_at on public.countries;
create trigger set_updated_at before update on public.countries for each row execute procedure public.set_updated_at();
grant select, insert, update, delete on public.countries to authenticated;
