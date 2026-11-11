-- Kurunduwatta supply app — database schema for Supabase.
-- Run this once: Supabase dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again (it skips things that already exist).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  -- what people type to log in (Sinhala or English); email is internal only
  username text not null,
  email text not null,
  role text not null check (role in ('chef', 'supervisor', 'hr')),
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.app_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

create table if not exists public.recipes (
  id text primary key,
  name text not null,
  category text not null,
  ingredients jsonb not null default '[]'::jsonb,
  -- true once the chef has checked the amounts (starting amounts are estimates)
  reviewed boolean not null default false,
  -- which menu the dish is on: the guest menu or the villa staff menu
  menu text not null default 'guests' check (menu in ('guests', 'staff')),
  updated_at bigint
);

create table if not exists public.supply_lists (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'guests' check (audience in ('guests', 'staff')),
  title text not null,
  event_date text not null,
  meal text not null,
  guest_count int not null check (guest_count > 0),
  -- staff lists: how many days the order is for
  days int check (days is null or days > 0),
  dishes jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  status text not null,
  history jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles (id),
  created_by_name text not null,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.transfer_outs (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.supply_lists (id) on delete cascade,
  supply_title text not null,
  guest_count int not null,
  date text not null,
  items jsonb not null default '[]'::jsonb,
  recipients jsonb not null default '[]'::jsonb,
  status text not null,
  history jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles (id),
  created_by_name text not null,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists transfer_outs_supply_id_idx on public.transfer_outs (supply_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  action text not null,
  doc_id text not null,
  doc_title text not null,
  by_name text not null,
  by_role text not null,
  note text not null default '',
  read boolean not null default false,
  created_at bigint not null
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- One row per (phone/browser, account) that turned on popups. A shared
-- device can belong to several accounts. Only the server touches it.
create table if not exists public.push_subscriptions (
  endpoint text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  primary key (endpoint, user_id)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------- helpers

-- Role of the signed-in user, or null if they have no active account.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

-- Enforces the approval steps: chef → supervisor → HR.
create or replace function public.guard_workflow() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := my_role();
begin
  -- Server (secret key) requests have no signed-in user.
  if auth.uid() is null then
    return new;
  end if;
  if r is null then
    raise exception 'no active account';
  end if;

  if not (
       (r = 'chef' and old.status = 'returned_to_chef' and new.status = 'pending_supervisor')
    or (r = 'supervisor' and old.status in ('pending_supervisor', 'returned_to_supervisor')
                         and new.status in ('pending_hr', 'returned_to_chef'))
    or (r = 'hr' and old.status = 'pending_hr' and new.status in ('approved', 'returned_to_supervisor'))
  ) then
    raise exception 'this step is not allowed for %', r;
  end if;

  -- Only the chef may change what is on the list.
  if r <> 'chef' and
     (to_jsonb(new) - 'status' - 'history' - 'updated_at') <> (to_jsonb(old) - 'status' - 'history' - 'updated_at') then
    raise exception 'only the chef can change the list';
  end if;

  -- History can only grow by one entry per step.
  if jsonb_array_length(new.history) <> jsonb_array_length(old.history) + 1 then
    raise exception 'history must grow by one step';
  end if;

  new.created_by := old.created_by;
  new.created_by_name := old.created_by_name;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists supply_lists_guard on public.supply_lists;
create trigger supply_lists_guard before update on public.supply_lists
  for each row execute function public.guard_workflow();

drop trigger if exists transfer_outs_guard on public.transfer_outs;
create trigger transfer_outs_guard before update on public.transfer_outs
  for each row execute function public.guard_workflow();

-- ---------------------------------------------------------------- security (RLS)

alter table public.profiles enable row level security;
alter table public.app_meta enable row level security;
alter table public.recipes enable row level security;
alter table public.supply_lists enable row level security;
alter table public.transfer_outs enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

do $$
declare p record;
begin
  -- start clean so re-running the script updates the rules
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles', 'app_meta', 'recipes', 'supply_lists', 'transfer_outs', 'notifications', 'push_subscriptions')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- accounts: everyone with an account can see names and roles; HR manages them
create policy profiles_read on public.profiles for select to authenticated
  using (public.my_role() is not null or id = auth.uid());
create policy profiles_hr_update on public.profiles for update to authenticated
  using (public.my_role() = 'hr') with check (public.my_role() = 'hr');

-- "is first-time setup done?" is readable before login
create policy app_meta_read on public.app_meta for select to anon, authenticated using (true);

-- recipes: everyone reads; chef and HR edit
create policy recipes_read on public.recipes for select to authenticated using (public.my_role() is not null);
create policy recipes_insert on public.recipes for insert to authenticated with check (public.my_role() in ('chef', 'hr'));
create policy recipes_update on public.recipes for update to authenticated
  using (public.my_role() in ('chef', 'hr')) with check (public.my_role() in ('chef', 'hr'));
create policy recipes_delete on public.recipes for delete to authenticated using (public.my_role() in ('chef', 'hr'));

-- supply lists: everyone reads; chef creates; steps checked by the trigger
create policy supply_read on public.supply_lists for select to authenticated using (public.my_role() is not null);
create policy supply_insert on public.supply_lists for insert to authenticated
  with check (public.my_role() = 'chef' and status = 'pending_supervisor' and created_by = auth.uid());
create policy supply_update on public.supply_lists for update to authenticated
  using (public.my_role() is not null) with check (public.my_role() is not null);

-- leftovers to staff: same, and only for an approved supply list
create policy transfer_read on public.transfer_outs for select to authenticated using (public.my_role() is not null);
create policy transfer_insert on public.transfer_outs for insert to authenticated
  with check (
    public.my_role() = 'chef' and status = 'pending_supervisor' and created_by = auth.uid()
    and exists (select 1 from public.supply_lists s where s.id = supply_id and s.status = 'approved')
  );
create policy transfer_update on public.transfer_outs for update to authenticated
  using (public.my_role() is not null) with check (public.my_role() is not null);

-- notifications: you see and mark your own; anyone with an account can send
create policy notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy notif_insert on public.notifications for insert to authenticated with check (public.my_role() is not null);

-- push_subscriptions: no policies = only the server (secret key) can use it

-- ---------------------------------------------------------------- live updates

do $$
declare t text;
begin
  foreach t in array array['profiles', 'recipes', 'supply_lists', 'transfer_outs', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
