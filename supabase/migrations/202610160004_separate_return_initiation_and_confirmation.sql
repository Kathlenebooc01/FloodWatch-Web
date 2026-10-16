-- The mobile app currently writes Returned when the LGU starts a return.
-- Reserve Returned for a PDRRMO confirmation, including for existing requests.
alter table public.resource_requests
  add column if not exists return_confirmed_at timestamptz;

create or replace function public.require_lgu_return_before_allocation_confirmation()
returns trigger language plpgsql as $$
begin
  if new.batch = 'Returned' and old.batch is distinct from 'Returned' then
    if current_setting('app.confirming_resource_return', true) is distinct from 'yes' then
      new.batch := 'Returning';
      new.returned_at := null;
    elsif old.batch is distinct from 'Returning'
      and not exists (
        select 1 from public.resource_requests
        where request_id = new.request_id and status in ('Returning', 'Returned')
      ) then
      raise exception 'LGU must initiate the return before PDRRMO confirmation';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.require_lgu_return_before_request_confirmation()
returns trigger language plpgsql as $$
begin
  if new.return_confirmed_at is distinct from old.return_confirmed_at
     and current_setting('app.confirming_resource_return', true) is distinct from 'yes' then
    raise exception 'Only PDRRMO may confirm a return';
  end if;
  if new.status = 'Returned' and old.status is distinct from 'Returned' then
    if current_setting('app.confirming_resource_return', true) is distinct from 'yes' then
      new.status := 'Returning';
    elsif not exists (
      select 1 from public.resource_allocations where request_id = new.request_id
    ) or exists (
      select 1 from public.resource_allocations
      where request_id = new.request_id and batch is distinct from 'Returned'
    ) then
      raise exception 'All allocations must be confirmed returned before the request';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.confirm_resource_return(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  current_request public.resource_requests%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'provincial_admin'
  ) then
    raise exception 'Only a provincial admin may confirm a return';
  end if;

  select * into current_request from public.resource_requests
  where request_id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if current_request.return_confirmed_at is not null then
    raise exception 'Return already confirmed';
  end if;
  if current_request.status not in ('Returning', 'Returned')
     and not exists (
       select 1 from public.resource_allocations
       where request_id = p_request_id and batch = 'Returning'
     ) then
    raise exception 'LGU has not initiated the return';
  end if;
  if not exists (
    select 1 from public.resource_allocations where request_id = p_request_id
  ) then
    raise exception 'No allocations to confirm';
  end if;

  perform set_config('app.confirming_resource_return', 'yes', true);
  update public.resource_allocations
  set batch = 'Returned', returned_at = coalesce(returned_at, now())
  where request_id = p_request_id and batch is distinct from 'Returned';
  update public.resource_requests
  set status = 'Returned', return_confirmed_at = now()
  where request_id = p_request_id;
  perform set_config('app.confirming_resource_return', '', true);
end;
$$;

revoke all on function public.confirm_resource_return(uuid) from public;
grant execute on function public.confirm_resource_return(uuid) to authenticated;
