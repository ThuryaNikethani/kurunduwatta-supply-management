-- The supervisor may change the amounts on a supply list while sending it to HR,
-- but only together with a reason. Everything else on a list stays chef-only.
create or replace function public.guard_workflow() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := my_role();
  locked text[] := array['status', 'history', 'updated_at'];
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

  if r <> 'chef' then
    -- Supervisor sending a supply list to HR may also change the items.
    if r = 'supervisor' and tg_table_name = 'supply_lists' and new.status = 'pending_hr' then
      if (to_jsonb(new) - locked - 'items') <> (to_jsonb(old) - locked - 'items') then
        raise exception 'only the chef can change the list';
      end if;
      if new.items is distinct from old.items
         and coalesce(btrim(new.history -> -1 ->> 'note'), '') = '' then
        raise exception 'a reason is needed when changing amounts';
      end if;
    elsif (to_jsonb(new) - locked) <> (to_jsonb(old) - locked) then
      raise exception 'only the chef can change the list';
    end if;
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
