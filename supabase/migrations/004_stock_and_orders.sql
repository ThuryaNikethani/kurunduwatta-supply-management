-- Stock (ගබඩාව) and purchase orders (ඇණවුම්). Run once in the SQL Editor.
-- Stock amounts only change through the functions below, never directly.

-- ---------------------------------------------------------------- tables

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null check (unit in ('g', 'kg', 'ml', 'l', 'pcs', 'pkt', 'btl', 'bunch')),
  qty numeric not null default 0 check (qty >= 0),
  min_qty numeric not null default 0 check (min_qty >= 0),
  updated_at bigint
);
create unique index if not exists stock_items_name_unit_idx on public.stock_items (lower(name), unit);

create table if not exists public.stock_moves (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.stock_items (id) on delete cascade,
  item_name text not null,
  unit text not null,
  change numeric not null,
  qty_after numeric not null,
  reason text not null check (reason in ('issue', 'receive', 'adjust')),
  note text not null default '',
  ref_kind text,
  ref_id text,
  by_uid uuid,
  by_name text not null default '',
  created_at bigint not null
);
create index if not exists stock_moves_item_idx on public.stock_moves (item_id, created_at desc);

-- One row per supply list that was taken out of stock.
create table if not exists public.stock_issues (
  supply_id uuid primary key references public.supply_lists (id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  by_uid uuid,
  by_name text not null default '',
  created_at bigint not null
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  items jsonb not null default '[]'::jsonb,
  status text not null check (status in ('pending_hr', 'returned', 'approved', 'received')),
  history jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles (id),
  created_by_name text not null,
  created_at bigint not null,
  updated_at bigint not null
);

-- ---------------------------------------------------------------- stock changes

create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select name from profiles where id = auth.uid()
$$;

-- Add (+) or take out (−) stock and record why. Supervisor or HR only.
create or replace function public.stock_change(
  p_item uuid, p_change numeric, p_reason text, p_note text default '',
  p_ref_kind text default null, p_ref_id text default null
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  it stock_items;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if coalesce(my_role(), '') not in ('supervisor', 'hr') then
    raise exception 'only the supervisor or HR can change stock';
  end if;
  if p_reason = 'adjust' and coalesce(trim(p_note), '') = '' then
    raise exception 'a reason is needed to correct stock';
  end if;
  update stock_items set qty = qty + p_change, updated_at = now_ms where id = p_item returning * into it;
  if not found then raise exception 'stock item not found'; end if;
  if it.qty < 0 then raise exception 'not enough stock for %', it.name; end if;
  insert into stock_moves (item_id, item_name, unit, change, qty_after, reason, note, ref_kind, ref_id, by_uid, by_name, created_at)
  values (it.id, it.name, it.unit, p_change, it.qty, p_reason, coalesce(p_note, ''), p_ref_kind, p_ref_id, auth.uid(), coalesce(my_name(), ''), now_ms);
  return it.qty;
end;
$$;

-- Take an approved supply list out of stock, once. p_lines: [{ "itemId": uuid, "qty": number }]
create or replace function public.issue_supply(p_supply uuid, p_lines jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  l jsonb;
  s supply_lists;
begin
  if coalesce(my_role(), '') not in ('supervisor', 'hr') then
    raise exception 'only the supervisor or HR can issue stock';
  end if;
  select * into s from supply_lists where id = p_supply;
  if not found or s.status <> 'approved' then raise exception 'only an approved list can be issued'; end if;
  if exists (select 1 from stock_issues where supply_id = p_supply) then raise exception 'already issued'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    if (l->>'qty')::numeric > 0 then
      perform stock_change((l->>'itemId')::uuid, -((l->>'qty')::numeric), 'issue', s.title, 'supply', p_supply::text);
    end if;
  end loop;
  insert into stock_issues (supply_id, lines, by_uid, by_name, created_at)
  values (p_supply, p_lines, auth.uid(), coalesce(my_name(), ''), (extract(epoch from now()) * 1000)::bigint);
end;
$$;

-- Mark an approved order as received and add it to stock.
-- p_lines: [{ "itemId": uuid|null, "name": text, "unit": text, "qty": number }]
create or replace function public.receive_order(p_order uuid, p_lines jsonb, p_entry jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  l jsonb;
  item uuid;
  o purchase_orders;
begin
  if coalesce(my_role(), '') <> 'supervisor' then raise exception 'only the supervisor can receive orders'; end if;
  select * into o from purchase_orders where id = p_order;
  if not found or o.status <> 'approved' then raise exception 'only an approved order can be received'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    item := nullif(l->>'itemId', '')::uuid;
    if item is null then
      insert into stock_items (name, unit, qty, min_qty, updated_at)
      values (trim(l->>'name'), l->>'unit', 0, 0, (extract(epoch from now()) * 1000)::bigint)
      on conflict (lower(name), unit) do nothing;
      select id into item from stock_items where lower(name) = lower(trim(l->>'name')) and unit = l->>'unit';
    end if;
    if (l->>'qty')::numeric > 0 then
      perform stock_change(item, (l->>'qty')::numeric, 'receive', o.supplier, 'po', p_order::text);
    end if;
  end loop;
  update purchase_orders
     set status = 'received', history = history || jsonb_build_array(p_entry),
         updated_at = (extract(epoch from now()) * 1000)::bigint
   where id = p_order;
end;
$$;

-- Order steps: supervisor sends → HR approves or returns → supervisor receives.
create or replace function public.guard_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := my_role();
begin
  if auth.uid() is null then return new; end if;
  if r is null then raise exception 'no active account'; end if;
  if not (
       (r = 'supervisor' and old.status = 'returned' and new.status = 'pending_hr')
    or (r = 'supervisor' and old.status = 'approved' and new.status = 'received')
    or (r = 'hr' and old.status = 'pending_hr' and new.status in ('approved', 'returned'))
  ) then
    raise exception 'this step is not allowed for %', r;
  end if;
  if not (r = 'supervisor' and new.status = 'pending_hr') and
     (to_jsonb(new) - 'status' - 'history' - 'updated_at') <> (to_jsonb(old) - 'status' - 'history' - 'updated_at') then
    raise exception 'only the supervisor can change an order, when resending it';
  end if;
  if jsonb_array_length(new.history) <> jsonb_array_length(old.history) + 1 then
    raise exception 'history must grow by one step';
  end if;
  new.created_by := old.created_by;
  new.created_by_name := old.created_by_name;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists purchase_orders_guard on public.purchase_orders;
create trigger purchase_orders_guard before update on public.purchase_orders
  for each row execute function public.guard_order();

-- ---------------------------------------------------------------- security (RLS)

alter table public.stock_items enable row level security;
alter table public.stock_moves enable row level security;
alter table public.stock_issues enable row level security;
alter table public.purchase_orders enable row level security;

drop policy if exists stock_read on public.stock_items;
drop policy if exists stock_insert on public.stock_items;
drop policy if exists stock_update on public.stock_items;
drop policy if exists stock_delete on public.stock_items;
drop policy if exists moves_read on public.stock_moves;
drop policy if exists issues_read on public.stock_issues;
drop policy if exists po_read on public.purchase_orders;
drop policy if exists po_insert on public.purchase_orders;
drop policy if exists po_update on public.purchase_orders;

create policy stock_read on public.stock_items for select to authenticated using (public.my_role() is not null);
-- New items start at 0; amounts change only through stock_change().
create policy stock_insert on public.stock_items for insert to authenticated
  with check (public.my_role() in ('supervisor', 'hr') and qty = 0);
create policy stock_update on public.stock_items for update to authenticated
  using (public.my_role() in ('supervisor', 'hr')) with check (public.my_role() in ('supervisor', 'hr'));
create policy stock_delete on public.stock_items for delete to authenticated using (public.my_role() in ('supervisor', 'hr'));
revoke update on public.stock_items from authenticated;
grant update (name, unit, min_qty, updated_at) on public.stock_items to authenticated;

create policy moves_read on public.stock_moves for select to authenticated using (public.my_role() is not null);
create policy issues_read on public.stock_issues for select to authenticated using (public.my_role() is not null);

create policy po_read on public.purchase_orders for select to authenticated using (public.my_role() is not null);
create policy po_insert on public.purchase_orders for insert to authenticated
  with check (public.my_role() = 'supervisor' and status = 'pending_hr' and created_by = auth.uid());
create policy po_update on public.purchase_orders for update to authenticated
  using (public.my_role() is not null) with check (public.my_role() is not null);

grant execute on function public.stock_change(uuid, numeric, text, text, text, text) to authenticated;
grant execute on function public.issue_supply(uuid, jsonb) to authenticated;
grant execute on function public.receive_order(uuid, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------- live updates

do $$
declare t text;
begin
  foreach t in array array['stock_items', 'stock_moves', 'stock_issues', 'purchase_orders'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
