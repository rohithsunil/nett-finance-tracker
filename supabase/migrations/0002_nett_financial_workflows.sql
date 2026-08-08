-- Nett 1.3 financial workflows
-- Safe to run after 0001_nett_mvp.sql. All functions validate the signed-in user.

alter table public.accounts
  add column if not exists institution_name text,
  add column if not exists account_last4 text,
  add column if not exists country_code text not null default 'AE';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_account_last4_digits') then
    alter table public.accounts add constraint accounts_account_last4_digits check (account_last4 is null or account_last4 ~ '^[0-9]{4}$');
  end if;
end $$;

alter table public.debts add column if not exists country_code text not null default 'AE';
alter table public.receivables add column if not exists country_code text not null default 'AE';
alter table public.investments add column if not exists country_code text not null default 'AE';
alter table public.commitments add column if not exists country_code text not null default 'AE';
alter table public.reserves add column if not exists country_code text not null default 'AE';

create index if not exists accounts_user_country_idx on public.accounts(user_id, country_code);
create index if not exists debts_user_country_idx on public.debts(user_id, country_code);
create index if not exists commitments_user_due_idx on public.commitments(user_id, due_date, status);
create index if not exists investment_values_latest_idx on public.investment_values(user_id, investment_id, valued_at desc);

create or replace function public.nett_post_transaction(
  p_user_id uuid,
  p_transaction_id uuid,
  p_workspace_id uuid,
  p_account_id uuid,
  p_space_id uuid,
  p_type text,
  p_amount numeric,
  p_currency text,
  p_category text,
  p_description text,
  p_occurred_at timestamptz,
  p_balance_delta numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Not authorised'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_account_id is not null then
    update public.accounts
       set estimated_balance = coalesce(estimated_balance, verified_balance) + p_balance_delta,
           updated_at = timezone('utc', now())
     where id = p_account_id and user_id = p_user_id;
    if not found then raise exception 'Account not found'; end if;
  end if;
  insert into public.transactions(id, user_id, workspace_id, account_id, space_id, type, amount, currency, category, description, occurred_at)
  values (p_transaction_id, p_user_id, p_workspace_id, p_account_id, p_space_id, p_type, p_amount, p_currency, nullif(p_category, ''), nullif(p_description, ''), coalesce(p_occurred_at, timezone('utc', now())));
  insert into public.audit_log(user_id, entity_type, entity_id, action, after_payload)
  values (p_user_id, 'transaction', p_transaction_id, 'created', jsonb_build_object('type', p_type, 'amount', p_amount, 'currency', p_currency));
  select to_jsonb(t) into result from public.transactions t where t.id = p_transaction_id;
  return result;
end;
$$;

create or replace function public.nett_apply_debt_event(
  p_user_id uuid,
  p_debt_id uuid,
  p_event_type text,
  p_amount numeric,
  p_currency text,
  p_source_account_id uuid,
  p_note text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  debt_row public.debts%rowtype;
  event_row public.debt_events%rowtype;
  next_outstanding numeric;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Not authorised'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into debt_row from public.debts where id = p_debt_id and user_id = p_user_id for update;
  if not found then raise exception 'Debt not found'; end if;
  next_outstanding := case when p_event_type = 'borrowing' then debt_row.outstanding + p_amount else greatest(0, debt_row.outstanding - p_amount) end;
  insert into public.debt_events(user_id, debt_id, event_type, amount, currency, source_account_id, note, occurred_at)
  values (p_user_id, p_debt_id, p_event_type, p_amount, p_currency, p_source_account_id, nullif(p_note, ''), coalesce(p_occurred_at, timezone('utc', now()))) returning * into event_row;
  update public.debts set outstanding = next_outstanding, status = case when next_outstanding = 0 then 'settled' else 'open' end, updated_at = timezone('utc', now()) where id = p_debt_id;
  if p_source_account_id is not null then
    update public.accounts set estimated_balance = coalesce(estimated_balance, verified_balance) + case when p_event_type = 'borrowing' then p_amount else -p_amount end, updated_at = timezone('utc', now()) where id = p_source_account_id and user_id = p_user_id;
    if not found then raise exception 'Source account not found'; end if;
  end if;
  insert into public.audit_log(user_id, entity_type, entity_id, action, after_payload) values (p_user_id, 'debt', p_debt_id, p_event_type, jsonb_build_object('amount', p_amount, 'currency', p_currency));
  return jsonb_build_object('debt', to_jsonb((select d from public.debts d where d.id = p_debt_id)), 'event', to_jsonb(event_row));
end;
$$;

create or replace function public.nett_apply_receivable_event(
  p_user_id uuid,
  p_receivable_id uuid,
  p_event_type text,
  p_amount numeric,
  p_currency text,
  p_destination_account_id uuid,
  p_note text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.receivables%rowtype;
  event_row public.receivable_events%rowtype;
  next_outstanding numeric;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Not authorised'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into item from public.receivables where id = p_receivable_id and user_id = p_user_id for update;
  if not found then raise exception 'Receivable not found'; end if;
  next_outstanding := greatest(0, item.outstanding - p_amount);
  insert into public.receivable_events(user_id, receivable_id, event_type, amount, currency, destination_account_id, note, occurred_at)
  values (p_user_id, p_receivable_id, p_event_type, p_amount, p_currency, p_destination_account_id, nullif(p_note, ''), coalesce(p_occurred_at, timezone('utc', now()))) returning * into event_row;
  update public.receivables set outstanding = next_outstanding, status = case when next_outstanding = 0 then 'settled' else 'open' end, updated_at = timezone('utc', now()) where id = p_receivable_id;
  if p_destination_account_id is not null then
    update public.accounts set estimated_balance = coalesce(estimated_balance, verified_balance) + p_amount, updated_at = timezone('utc', now()) where id = p_destination_account_id and user_id = p_user_id;
    if not found then raise exception 'Destination account not found'; end if;
  end if;
  insert into public.audit_log(user_id, entity_type, entity_id, action, after_payload) values (p_user_id, 'receivable', p_receivable_id, p_event_type, jsonb_build_object('amount', p_amount, 'currency', p_currency));
  return jsonb_build_object('receivable', to_jsonb((select r from public.receivables r where r.id = p_receivable_id)), 'event', to_jsonb(event_row));
end;
$$;

create or replace function public.nett_create_transfer(
  p_user_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_source_amount numeric,
  p_destination_amount numeric,
  p_source_currency text,
  p_destination_currency text,
  p_fee numeric,
  p_description text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source public.accounts%rowtype;
  destination public.accounts%rowtype;
  transfer_id uuid := gen_random_uuid();
  workspace_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Not authorised'; end if;
  if p_source_amount <= 0 or p_destination_amount <= 0 then raise exception 'Transfer amounts must be positive'; end if;
  select * into source from public.accounts where id = p_source_account_id and user_id = p_user_id for update;
  select * into destination from public.accounts where id = p_destination_account_id and user_id = p_user_id for update;
  if source.id is null or destination.id is null then raise exception 'Transfer accounts not found'; end if;
  workspace_id := source.workspace_id;
  update public.accounts set estimated_balance = coalesce(estimated_balance, verified_balance) - p_source_amount - coalesce(p_fee, 0), updated_at = timezone('utc', now()) where id = source.id;
  update public.accounts set estimated_balance = coalesce(estimated_balance, verified_balance) + p_destination_amount, updated_at = timezone('utc', now()) where id = destination.id;
  insert into public.transactions(user_id, workspace_id, account_id, type, amount, currency, description, transfer_group_id, occurred_at)
  values (p_user_id, workspace_id, source.id, 'transfer', p_source_amount + coalesce(p_fee, 0), p_source_currency, nullif(p_description, ''), transfer_id, coalesce(p_occurred_at, timezone('utc', now()))),
         (p_user_id, destination.workspace_id, destination.id, 'transfer', p_destination_amount, p_destination_currency, nullif(p_description, ''), transfer_id, coalesce(p_occurred_at, timezone('utc', now())));
  insert into public.audit_log(user_id, entity_type, entity_id, action, after_payload) values (p_user_id, 'transfer', transfer_id, 'created', jsonb_build_object('source_amount', p_source_amount, 'destination_amount', p_destination_amount, 'fee', coalesce(p_fee, 0)));
  return transfer_id;
end;
$$;

revoke all on function public.nett_post_transaction(uuid, uuid, uuid, uuid, uuid, text, numeric, text, text, text, timestamptz, numeric) from public;
revoke all on function public.nett_apply_debt_event(uuid, uuid, text, numeric, text, uuid, text, timestamptz) from public;
revoke all on function public.nett_apply_receivable_event(uuid, uuid, text, numeric, text, uuid, text, timestamptz) from public;
revoke all on function public.nett_create_transfer(uuid, uuid, uuid, numeric, numeric, text, text, numeric, text, timestamptz) from public;
grant execute on function public.nett_post_transaction(uuid, uuid, uuid, uuid, uuid, text, numeric, text, text, text, timestamptz, numeric) to authenticated;
grant execute on function public.nett_apply_debt_event(uuid, uuid, text, numeric, text, uuid, text, timestamptz) to authenticated;
grant execute on function public.nett_apply_receivable_event(uuid, uuid, text, numeric, text, uuid, text, timestamptz) to authenticated;
grant execute on function public.nett_create_transfer(uuid, uuid, uuid, numeric, numeric, text, text, numeric, text, timestamptz) to authenticated;
