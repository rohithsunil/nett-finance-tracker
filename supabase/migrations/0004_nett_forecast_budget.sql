-- Nett 1.14: saved forecast scenarios and month-level budget plans.
-- Actual budget spend remains derived from transactions so the two views cannot drift.

create table if not exists public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  kind text not null default 'expense' check (kind in ('expense', 'income', 'debt')),
  amount numeric(20,4) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  month_offset integer not null default 0 check (month_offset between 0 and 60),
  country_code text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  month date not null,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  category text,
  amount numeric(20,4) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  country_code text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists forecast_scenarios_user_idx on public.forecast_scenarios(user_id, month_offset);
create index if not exists budget_lines_user_month_idx on public.budget_lines(user_id, month desc);

alter table public.forecast_scenarios enable row level security;
alter table public.budget_lines enable row level security;

drop policy if exists owner_all on public.forecast_scenarios;
create policy owner_all on public.forecast_scenarios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists owner_all on public.budget_lines;
create policy owner_all on public.budget_lines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.forecast_scenarios;
create trigger set_updated_at before update on public.forecast_scenarios for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.budget_lines;
create trigger set_updated_at before update on public.budget_lines for each row execute procedure public.set_updated_at();

grant select, insert, update, delete on public.forecast_scenarios, public.budget_lines to authenticated;
