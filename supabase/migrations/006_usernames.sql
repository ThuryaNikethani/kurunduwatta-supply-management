-- Log in with a username (Sinhala or English) instead of an email.
-- Existing accounts get their name in lower case as the username.
alter table public.profiles add column if not exists username text;
update public.profiles set username = lower(trim(name)) where username is null;
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_key on public.profiles (lower(username));
