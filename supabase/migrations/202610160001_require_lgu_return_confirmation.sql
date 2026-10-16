-- The LGU records its return by moving an allocation to Returning.
-- Only that recorded state may be confirmed as Returned.
create or replace function public.require_lgu_return_before_allocation_confirmation()
returns trigger
language plpgsql
as $$
begin
  if new.batch = 'Returned' and old.batch is distinct from 'Returned'
     and old.batch is distinct from 'Returning' then
    raise exception 'LGU must return resources to PDRRMO before confirmation';
  end if;
  return new;
end;
$$;

create trigger require_lgu_return_before_allocation_confirmation
before update of batch on public.resource_allocations
for each row execute function public.require_lgu_return_before_allocation_confirmation();

create or replace function public.require_lgu_return_before_request_confirmation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Returned' and old.status is distinct from 'Returned'
     and (not exists (
       select 1 from public.resource_allocations where request_id = new.request_id
     ) or exists (
       select 1 from public.resource_allocations
       where request_id = new.request_id and batch is distinct from 'Returned'
     )) then
    raise exception 'All allocations must be confirmed returned before the request';
  end if;
  return new;
end;
$$;

create trigger require_lgu_return_before_request_confirmation
before update of status on public.resource_requests
for each row execute function public.require_lgu_return_before_request_confirmation();
