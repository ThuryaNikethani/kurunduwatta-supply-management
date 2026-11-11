-- Staff lists: how many days the order is for (guest lists leave it empty).
alter table public.supply_lists add column if not exists days int check (days is null or days > 0);
