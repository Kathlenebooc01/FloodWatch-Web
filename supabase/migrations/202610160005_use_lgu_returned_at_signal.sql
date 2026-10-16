-- The LGU Submission History return action sets resource_allocations.returned_at.
-- It leaves resource_requests.status and resource_allocations.batch at In_Transit.
create or replace function public.require_lgu_return_before_allocation_confirmation()
returns trigger language plpgsql as $$
begin
  if new.batch = 'Returned' and old.batch is distinct from 'Returned' then
    if current_setting('app.confirming_resource_return', true) is distinct from 'yes' then
      new.batch := 'Returning';
    elsif old.returned_at is null
      and old.batch is distinct from 'Returning'
      and not exists (
        select 1 from public.resource_requests
        where request_id = new.request_id and status = 'Returning'
      ) then
      raise exception 'LGU must initiate the return before PDRRMO confirmation';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.record_lgu_resource_return_initiation()
returns trigger language plpgsql as $$
begin
  if old.returned_at is null and new.returned_at is not null
     and current_setting('app.confirming_resource_return', true) is distinct from 'yes' then
    update public.resource_requests
    set status = 'Returning'
    where request_id = new.request_id
      and status in ('In_Transit', 'Received');
  end if;
  return new;
end;
$$;

create trigger record_lgu_resource_return_initiation
after update of returned_at on public.resource_allocations
for each row execute function public.record_lgu_resource_return_initiation();

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
  if not exists (
    select 1 from public.resource_allocations
    where request_id = p_request_id and returned_at is not null
  ) and current_request.status <> 'Returning' then
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
