-- Provincial distress monitoring uses only records submitted to distress_signals.
-- Keep existing allowed statuses and add the Provincial Admin's Verified state.
do $$
declare existing_check text;
begin
  select pg_get_expr(c.conbin, c.conrelid) into existing_check
  from pg_constraint c
  where c.conrelid = 'public.distress_signals'::regclass
    and c.conname = 'distress_signals_status_check' and c.contype = 'c';
  if existing_check is not null then
    alter table public.distress_signals drop constraint distress_signals_status_check;
    execute format(
      'alter table public.distress_signals add constraint distress_signals_status_check check ((%s) or status = %L)',
      existing_check, 'Verified');
  end if;
end;
$$;

alter table public.notifications
  add column if not exists escalation_distress_id uuid references public.distress_signals(distress_id);

create unique index if not exists notifications_one_distress_verification
  on public.notifications(escalation_distress_id)
  where escalation_distress_id is not null and title = 'Escalation Verified';

create or replace function public.verify_distress_signal(p_distress_id uuid)
returns public.distress_signals
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result public.distress_signals;
  admin_province public.profiles.province_id%type;
begin
  select province_id into admin_province from public.profiles
  where id = auth.uid() and role = 'provincial_admin';
  if admin_province is null then
    raise exception 'Provincial admin access required' using errcode = '42501';
  end if;

  select ds.* into result from public.distress_signals ds
  join public.municipality_or_city m on m.municipality_id = ds.municipality_id
  where ds.distress_id = p_distress_id and m.province_id = admin_province
  for update of ds;
  if not found then
    raise exception 'Distress signal not found in your province' using errcode = 'P0002';
  end if;
  if lower(result.status) = 'verified' then return result; end if;
  if lower(result.status) <> 'pending' then
    raise exception 'Only a pending distress signal can be accepted' using errcode = '22023';
  end if;

  update public.distress_signals
  set status = 'Verified', acknowledged_at = now(), acknowledged_by = auth.uid()
  where distress_id = p_distress_id
  returning * into result;

  if result.profile_id is not null then
    insert into public.notifications
      (user_id, title, message, type, target_role, escalation_distress_id)
    values
      (result.profile_id, 'Escalation Verified',
       'Your support escalation request has been accepted and verified by the Provincial Admin (PDRRMO).',
       'Updates', 'lgu', result.distress_id)
    on conflict do nothing;
  end if;
  return result;
end;
$$;

revoke all on function public.verify_distress_signal(uuid) from public;
grant execute on function public.verify_distress_signal(uuid) to authenticated;

create or replace function public.reject_distress_signal(p_distress_id uuid)
returns public.distress_signals
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  result public.distress_signals;
  admin_province public.profiles.province_id%type;
begin
  select province_id into admin_province from public.profiles
  where id = auth.uid() and role = 'provincial_admin';
  if admin_province is null then
    raise exception 'Provincial admin access required' using errcode = '42501';
  end if;

  select ds.* into result from public.distress_signals ds
  join public.municipality_or_city m on m.municipality_id = ds.municipality_id
  where ds.distress_id = p_distress_id and m.province_id = admin_province
  for update of ds;
  if not found then
    raise exception 'Distress signal not found in your province' using errcode = 'P0002';
  end if;
  if lower(result.status) = 'rejected' then return result; end if;
  if lower(result.status) <> 'pending' then
    raise exception 'Only a pending distress signal can be rejected' using errcode = '22023';
  end if;

  update public.distress_signals set status = 'Rejected'
  where distress_id = p_distress_id returning * into result;
  return result;
end;
$$;

revoke all on function public.reject_distress_signal(uuid) from public;
grant execute on function public.reject_distress_signal(uuid) to authenticated;

alter table public.distress_signals enable row level security;
grant select, insert on public.distress_signals to authenticated;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'distress_signals'
      and policyname = 'provincial_admin_reads_distress_signals'
  ) then
    create policy provincial_admin_reads_distress_signals
      on public.distress_signals for select to authenticated
      using (exists (
        select 1 from public.profiles p
        join public.municipality_or_city m on m.province_id = p.province_id
        where p.id = auth.uid() and p.role = 'provincial_admin'
          and m.municipality_id = distress_signals.municipality_id
      ));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'distress_signals'
      and policyname = 'lgu_creates_own_distress_signal'
  ) then
    create policy lgu_creates_own_distress_signal
      on public.distress_signals for insert to authenticated
      with check (
        profile_id = auth.uid() and lower(status) = 'pending'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('lgu_headmaster', 'lgu_frontliner')
            and p.municipality_id = distress_signals.municipality_id
        )
      );
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'distress_signals'
      and policyname = 'lgu_reads_own_distress_signals'
  ) then
    create policy lgu_reads_own_distress_signals
      on public.distress_signals for select to authenticated
      using (profile_id = auth.uid());
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename = 'distress_signals'
     ) then
    alter publication supabase_realtime add table public.distress_signals;
  end if;
end;
$$;
