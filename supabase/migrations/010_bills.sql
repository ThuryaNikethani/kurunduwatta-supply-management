-- Bills (බිල්පත්): HR keeps photos of shop bills with the shop, date, total and items,
-- for the monthly spending report. Only HR can see, add, change or remove them.
-- The photo is in the private "bills" storage bucket.

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  shop text not null default '',
  bill_date date not null,
  total numeric not null default 0 check (total >= 0),
  -- [{ "name": text, "qty": text, "amount": number }]
  items jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_by_name text not null default coalesce(public.my_name(), ''),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index if not exists bills_date_idx on public.bills (bill_date desc);

alter table public.bills enable row level security;

drop policy if exists bills_read on public.bills;
drop policy if exists bills_insert on public.bills;
drop policy if exists bills_update on public.bills;
drop policy if exists bills_delete on public.bills;

create policy bills_read on public.bills for select to authenticated using (public.my_role() = 'hr');
create policy bills_insert on public.bills for insert to authenticated
  with check (public.my_role() = 'hr' and created_by = auth.uid());
create policy bills_update on public.bills for update to authenticated
  using (public.my_role() = 'hr') with check (public.my_role() = 'hr');
-- Only the details can be corrected; the photo and who added it stay.
revoke update on public.bills from authenticated;
grant update (shop, bill_date, total, items) on public.bills to authenticated;
create policy bills_delete on public.bills for delete to authenticated using (public.my_role() = 'hr');

-- ---------------------------------------------------------------- photos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bills', 'bills', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists bills_photo_read on storage.objects;
drop policy if exists bills_photo_insert on storage.objects;
drop policy if exists bills_photo_delete on storage.objects;

create policy bills_photo_read on storage.objects for select to authenticated
  using (bucket_id = 'bills' and public.my_role() = 'hr');
create policy bills_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bills' and public.my_role() = 'hr');
create policy bills_photo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bills' and public.my_role() = 'hr');

-- ---------------------------------------------------------------- live updates

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bills'
  ) then
    alter publication supabase_realtime add table public.bills;
  end if;
end $$;
