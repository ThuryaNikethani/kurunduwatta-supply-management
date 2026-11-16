-- A second login name in Sinhala, so people can type either their English
-- or their Sinhala name. Optional; no two accounts may share it.
alter table public.profiles add column if not exists username_si text;
create unique index if not exists profiles_username_si_key
  on public.profiles (lower(username_si)) where username_si is not null;
