-- One phone/browser can now receive popups for several accounts
-- (staff who share a device). Run once in the SQL Editor.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_pkey;
alter table public.push_subscriptions add primary key (endpoint, user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
