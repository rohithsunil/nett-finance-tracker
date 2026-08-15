-- Nett 1.10: keep each user's country and currency choices personal.
alter table public.profiles
  add column if not exists enabled_countries jsonb not null default '["AE", "IN"]'::jsonb,
  add column if not exists enabled_currencies jsonb not null default '["AED", "INR"]'::jsonb;
