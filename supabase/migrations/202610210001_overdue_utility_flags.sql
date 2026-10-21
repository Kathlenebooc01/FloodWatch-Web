create table public.utility_overdue_flags (
  flag_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.resource_requests(request_id),
  lgu_id uuid not null references public.profiles(id),
  reason text not null,
  remarks text,
  expected_return_date date not null,
  flagged_at timestamptz not null default now(),
  flagged_by uuid not null references public.profiles(id),
  cleared_at timestamptz,
  cleared_by uuid references public.profiles(id),
  constraint utility_flag_reason_required check (length(btrim(reason)) > 0),
  constraint utility_flag_clear_pair check ((cleared_at is null) = (cleared_by is null))
);

create unique index utility_one_active_flag_per_request
  on public.utility_overdue_flags(request_id) where cleared_at is null;
create index utility_active_flags_by_lgu
  on public.utility_overdue_flags(lgu_id) where cleared_at is null;
alter publication supabase_realtime add table public.utility_overdue_flags;

alter table public.utility_overdue_flags enable row level security;
create policy utility_flags_provincial_read on public.utility_overdue_flags
  for select to authenticated using (exists (
    select 1 from public.profiles p
    join public.resource_requests r on r.request_id = utility_overdue_flags.request_id
    join public.municipality_or_city m on m.municipality_id = r.municipality_id
    where p.id = auth.uid() and p.role = 'provincial_admin' and p.province_id = m.province_id
  ));
create policy utility_flags_lgu_read on public.utility_overdue_flags
  for select to authenticated using (lgu_id = auth.uid());

alter table public.notifications
  add column utility_flag_id uuid references public.utility_overdue_flags(flag_id);
create unique index notifications_one_utility_flag_event
  on public.notifications(utility_flag_id, title) where utility_flag_id is not null;

create or replace function public.flag_overdue_utility_request(
  p_request_id uuid, p_reason text, p_remarks text default null
) returns public.utility_overdue_flags
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result public.utility_overdue_flags;
  request_row public.resource_requests%rowtype;
  due_date date;
  admin_province public.profiles.province_id%type;
begin
  select province_id into admin_province from public.profiles
  where id = auth.uid() and role = 'provincial_admin';
  if admin_province is null then raise exception 'Provincial admin access required'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'Flag reason is required'; end if;

  select r.* into request_row from public.resource_requests r
  join public.municipality_or_city m on m.municipality_id = r.municipality_id
  where r.request_id = p_request_id and m.province_id = admin_province
  for update of r;
  if not found then raise exception 'Request not found in your province'; end if;
  if not exists (select 1 from public.profiles p
                 where p.id = request_row.requested_by and p.role = 'lgu_headmaster') then
    raise exception 'Only LGU Headmaster requests can be flagged';
  end if;
  if lower(request_row.status) in ('pending', 'rejected', 'returned') or request_row.return_confirmed_at is not null then
    raise exception 'Only an accepted, unreturned request can be flagged';
  end if;
  select max(d) into due_date from (
    select case when pg_typeof(i.expected_return_date)::text = 'timestamp with time zone'
      then (i.expected_return_date at time zone 'Asia/Manila')::date
      else i.expected_return_date::date end as d
      from public.resource_request_items i where i.request_id = p_request_id
    union all
    select case when pg_typeof(a.expected_return_date)::text = 'timestamp with time zone'
      then (a.expected_return_date at time zone 'Asia/Manila')::date
      else a.expected_return_date::date end
      from public.resource_allocations a where a.request_id = p_request_id
  ) dates;
  if due_date is null or due_date >= (now() at time zone 'Asia/Manila')::date then
    raise exception 'Expected return date has not passed';
  end if;
  if not exists (select 1 from public.resource_allocations where request_id = p_request_id
                 and (batch in ('In_Transit', 'Received', 'Returning', 'Returned') or dispatched_at is not null)) then
    raise exception 'No dispatched utilities to flag';
  end if;

  insert into public.utility_overdue_flags
    (request_id, lgu_id, reason, remarks, expected_return_date, flagged_by)
  values (p_request_id, request_row.requested_by, btrim(p_reason), nullif(btrim(p_remarks), ''), due_date, auth.uid())
  returning * into result;
  insert into public.notifications (user_id, title, message, type, target_role, utility_flag_id)
  values (result.lgu_id, 'Utility Request Privileges Suspended',
    'Your account has been flagged due to overdue borrowed utilities. You are temporarily restricted from submitting new utility requests until the outstanding utilities are returned and your flag is cleared by the Provincial Admin. Request #' || left(p_request_id::text, 8) || '. Reason: ' || result.reason,
    'Updates', 'lgu', result.flag_id)
  on conflict do nothing;
  return result;
end;
$$;

create or replace function public.clear_overdue_utility_flag(p_flag_id uuid)
returns public.utility_overdue_flags
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result public.utility_overdue_flags;
  admin_province public.profiles.province_id%type;
begin
  select province_id into admin_province from public.profiles
  where id = auth.uid() and role = 'provincial_admin';
  if admin_province is null then raise exception 'Provincial admin access required'; end if;
  select f.* into result from public.utility_overdue_flags f
  join public.resource_requests r on r.request_id = f.request_id
  join public.municipality_or_city m on m.municipality_id = r.municipality_id
  where f.flag_id = p_flag_id and m.province_id = admin_province
  for update of f;
  if not found then raise exception 'Flag not found in your province'; end if;
  if result.cleared_at is not null then raise exception 'Flag already cleared'; end if;
  if not exists (
    select 1 from public.resource_requests r where r.request_id = result.request_id
    and r.return_confirmed_at is not null and r.status = 'Returned'
  ) or exists (
    select 1 from public.resource_allocations a where a.request_id = result.request_id
    and (a.returned_at is null or a.batch is distinct from 'Returned')
  ) then raise exception 'All utilities must be returned and confirmed first'; end if;
  update public.utility_overdue_flags set cleared_at = now(), cleared_by = auth.uid()
  where flag_id = p_flag_id returning * into result;
  if not exists (select 1 from public.utility_overdue_flags
                 where lgu_id = result.lgu_id and cleared_at is null) then
    insert into public.notifications (user_id, title, message, type, target_role, utility_flag_id)
    values (result.lgu_id, 'Utility Request Privileges Restored',
      'Your utility-related flag has been cleared by the Provincial Admin. You may now submit new utility requests, provided you have no other active restrictions.',
      'Updates', 'lgu', result.flag_id)
    on conflict do nothing;
  else
    insert into public.notifications (user_id, title, message, type, target_role, utility_flag_id)
    values (result.lgu_id, 'Utility Flag Cleared',
      'Your flag for utility request #' || left(result.request_id::text, 8) || ' has been cleared by the Provincial Admin. Your utility request privileges remain suspended while another active flag exists.',
      'Updates', 'lgu', result.flag_id)
    on conflict do nothing;
  end if;
  return result;
end;
$$;

create or replace function public.prevent_flagged_utility_request()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.utility_overdue_flags
             where lgu_id = new.requested_by and cleared_at is null) then
    raise exception 'Utility request privileges are suspended due to an active overdue flag';
  end if;
  return new;
end;
$$;
create trigger prevent_flagged_utility_request
  before insert on public.resource_requests
  for each row execute function public.prevent_flagged_utility_request();

revoke all on function public.flag_overdue_utility_request(uuid, text, text) from public;
revoke all on function public.clear_overdue_utility_flag(uuid) from public;
grant execute on function public.flag_overdue_utility_request(uuid, text, text) to authenticated;
grant execute on function public.clear_overdue_utility_flag(uuid) to authenticated;
