-- Recipes belong to the guest menu or the villa staff menu.
alter table public.recipes add column if not exists menu text not null default 'guests';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'recipes_menu_check') then
    alter table public.recipes add constraint recipes_menu_check check (menu in ('guests', 'staff'));
  end if;
end $$;
