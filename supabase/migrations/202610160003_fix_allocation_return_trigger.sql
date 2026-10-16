-- Replace the function if migration 002 was already applied.
-- resource_allocations has a batch field, but no status field.
create or replace function public.require_lgu_return_before_allocation_confirmation()
returns trigger
language plpgsql
as $$
begin
  if new.batch = 'Returned' and old.batch is distinct from 'Returned'
     and old.batch is distinct from 'Returning'
     and not exists (
       select 1 from public.resource_requests
       where request_id = new.request_id and status = 'Returning'
     ) then
    raise exception 'LGU must return resources to PDRRMO before confirmation';
  end if;
  return new;
end;
$$;
