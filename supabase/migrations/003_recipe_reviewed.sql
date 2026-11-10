-- Track which recipes the chef has checked (starting amounts are estimates).
alter table public.recipes add column if not exists reviewed boolean not null default false;
