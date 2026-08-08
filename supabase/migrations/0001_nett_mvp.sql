-- Nett V1 foundation: explicit ownership, decimal-safe money fields and RLS.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_currency text not null default 'AED' check (display_currency ~ '^[A-Z]{3}$'),
  locale text not null default 'en-AE',
  theme text not null default 'system' check (theme in ('light', 'dark', 'amoled', 'system')),
  freshness_days integer not null default 31 check (freshness_days between 1 and 3650),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'personal' check (kind in ('personal', 'business', 'other')),
  is_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  type text not null default 'current' check (type in ('current', 'savings', 'cash', 'wallet', 'business_bank', 'credit_card', 'other')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  verified_balance numeric(20,4) not null default 0,
  estimated_balance numeric(20,4),
  balance_verified_at timestamptz,
  include_net_worth boolean not null default true,
  include_liquidity boolean not null default true,
  archived boolean not null default false,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null unique references public.accounts(id) on delete cascade,
  credit_limit numeric(20,4) not null default 0,
  current_outstanding numeric(20,4) not null default 0,
  statement_balance numeric(20,4) not null default 0,
  statement_date date,
  payment_due_date date,
  minimum_payment numeric(20,4) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  color text not null default '#ff8dc7',
  budget numeric(20,4),
  allocation numeric(20,4),
  currency text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete set null,
  space_id uuid references public.spaces(id) on delete set null,
  type text not null check (type in ('credit', 'debit', 'transfer', 'debt_borrowing', 'debt_repayment', 'receivable_creation', 'receivable_repayment', 'adjustment')),
  amount numeric(20,4) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  category text,
  description text,
  occurred_at timestamptz not null default timezone('utc', now()),
  transfer_group_id uuid,
  reversed_transaction_id uuid references public.transactions(id) on delete set null,
  status text not null default 'posted' check (status in ('posted', 'pending', 'reversed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  debt_class text not null default 'flexible' check (debt_class in ('mandatory', 'flexible')),
  original_principal numeric(20,4) not null default 0,
  outstanding numeric(20,4) not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  comfortable_target numeric(20,4),
  due_date date,
  status text not null default 'open' check (status in ('open', 'settled', 'archived')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.debt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  event_type text not null check (event_type in ('borrowing', 'repayment', 'adjustment', 'reclassification')),
  amount numeric(20,4) not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  source_account_id uuid references public.accounts(id) on delete set null,
  occurred_at timestamptz not null default timezone('utc', now()),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  contact_name text not null,
  amount numeric(20,4) not null default 0,
  outstanding numeric(20,4) not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_on date not null default current_date,
  expected_on date,
  confidence text not null default 'confirmed' check (confidence in ('confirmed', 'likely', 'uncertain')),
  include_in_net_worth boolean not null default false,
  status text not null default 'open' check (status in ('open', 'settled', 'archived')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.receivable_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  event_type text not null check (event_type in ('creation', 'repayment', 'settlement', 'adjustment')),
  amount numeric(20,4) not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  destination_account_id uuid references public.accounts(id) on delete set null,
  occurred_at timestamptz not null default timezone('utc', now()),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  symbol text not null,
  exchange text,
  name text,
  quantity numeric(24,8) not null default 0,
  holding_currency text not null check (holding_currency ~ '^[A-Z]{3}$'),
  average_cost numeric(20,6) not null default 0,
  liquid boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.investment_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  value numeric(20,6) not null default 0,
  price numeric(20,6),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  source text not null default 'manual',
  valued_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  amount numeric(20,4) not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  due_date date not null,
  recurrence text not null default 'one_time' check (recurrence in ('one_time', 'weekly', 'monthly', 'quarterly', 'yearly')),
  importance text not null default 'mandatory' check (importance in ('mandatory', 'planned', 'optional')),
  expected_income boolean not null default false,
  confidence text not null default 'confirmed' check (confidence in ('confirmed', 'likely', 'possible')),
  notes text,
  status text not null default 'open' check (status in ('open', 'completed', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reserves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  commitment_id uuid references public.commitments(id) on delete set null,
  name text not null,
  target_amount numeric(20,4) not null default 0,
  funded_amount numeric(20,4) not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  due_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  balance numeric(20,4) not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  verified_at timestamptz not null default timezone('utc', now()),
  fx_rates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  display_currency text not null,
  snapshot_date date not null default current_date,
  primary_net_worth numeric(20,4) not null default 0,
  all_debt_net_worth numeric(20,4) not null default 0,
  liquid_cash numeric(20,4) not null default 0,
  safe_to_spend numeric(20,4) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(24,10) not null check (rate > 0),
  source text not null default 'manual',
  effective_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, base_currency, quote_currency, effective_at)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  byte_size bigint,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_payload jsonb,
  after_payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  platform text not null default 'web',
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, endpoint)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  check_in boolean not null default true,
  due_dates boolean not null default true,
  stale_data boolean not null default true,
  flexible_debt boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default timezone('utc', now())
);

-- A public, non-sensitive heartbeat endpoint for the external keep-alive job.
create table if not exists public.system_heartbeat (
  id integer primary key check (id = 1),
  last_seen_at timestamptz not null default timezone('utc', now())
);
insert into public.system_heartbeat(id) values (1) on conflict (id) do nothing;

create or replace function public.touch_keepalive()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.system_heartbeat set last_seen_at = timezone('utc', now()) where id = 1;
  select last_seen_at from public.system_heartbeat where id = 1;
$$;
revoke all on function public.touch_keepalive() from public;
grant execute on function public.touch_keepalive() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  workspace_id uuid;
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.workspaces(user_id, name, kind, is_default)
  values (new.id, 'Personal', 'personal', true)
  returning id into workspace_id;
  insert into public.notification_preferences(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles','workspaces','accounts','credit_cards','spaces','transactions','debts','debt_events','receivables','receivable_events','investments','investment_values','commitments','reserves','account_snapshots','snapshots','fx_rates','attachments','audit_log','notification_subscriptions','notification_preferences'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
  end loop;
end $$;

create trigger set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.workspaces for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.credit_cards for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.spaces for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.debts for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.receivables for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.investments for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.commitments for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.reserves for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.notification_preferences for each row execute procedure public.set_updated_at();

create index if not exists accounts_user_workspace_idx on public.accounts(user_id, workspace_id) where archived = false;
create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_at desc);
create index if not exists debts_user_class_idx on public.debts(user_id, debt_class, status);
create index if not exists commitments_user_due_idx on public.commitments(user_id, due_date) where status = 'open';
create index if not exists audit_user_created_idx on public.audit_log(user_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('nett-attachments', 'nett-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists nett_attachment_select on storage.objects;
create policy nett_attachment_select on storage.objects for select to authenticated
using (bucket_id = 'nett-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists nett_attachment_insert on storage.objects;
create policy nett_attachment_insert on storage.objects for insert to authenticated
with check (bucket_id = 'nett-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists nett_attachment_update on storage.objects;
create policy nett_attachment_update on storage.objects for update to authenticated
using (bucket_id = 'nett-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'nett-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists nett_attachment_delete on storage.objects;
create policy nett_attachment_delete on storage.objects for delete to authenticated
using (bucket_id = 'nett-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.accounts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.spaces enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_events enable row level security;
alter table public.receivables enable row level security;
alter table public.receivable_events enable row level security;
alter table public.investments enable row level security;
alter table public.investment_values enable row level security;
alter table public.commitments enable row level security;
alter table public.reserves enable row level security;
alter table public.account_snapshots enable row level security;
alter table public.snapshots enable row level security;
alter table public.fx_rates enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_log enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['workspaces','accounts','credit_cards','spaces','transactions','debts','debt_events','receivables','receivable_events','investments','investment_values','commitments','reserves','account_snapshots','snapshots','fx_rates','attachments','audit_log','notification_subscriptions','notification_preferences'] loop
    execute format('drop policy if exists owner_all on public.%I', table_name);
    execute format('create policy owner_all on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
  end loop;
end $$;

drop policy if exists owner_all on public.profiles;
create policy owner_all on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update on public.notification_subscriptions, public.notification_preferences to authenticated;
