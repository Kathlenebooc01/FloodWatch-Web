-- One persisted notification per submission and authorized provincial recipient.
alter table public.notifications
  add column source_event text,
  add column source_id uuid;

create unique index notifications_one_provincial_submission
  on public.notifications(user_id, source_event, source_id)
  where source_event in ('citizen_report', 'lgu_report', 'lgu_utility_request');

create or replace function public.notify_provincial_submission()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  submitter_role text;
  recipient record;
  municipality_name text;
  event_name text;
  event_id uuid;
  heading text;
  body text;
  resource_name text;
  urgency_name text;
  report_name text;
  province uuid;
begin
  if TG_TABLE_NAME = 'incident_report' then
    select role into submitter_role from public.profiles where id = new.user_id;
    if submitter_role not in ('citizen', 'lgu_headmaster', 'lgu_frontliner') then return new; end if;
    event_name := case when submitter_role = 'citizen' then 'citizen_report' else 'lgu_report' end;
    event_id := new.report_id;
    report_name := coalesce(nullif(btrim(new.report_type), ''), nullif(btrim(new.hazard_type), ''), 'Incident');
    heading := case when submitter_role = 'citizen' then 'New Citizen Report' else 'New LGU Report' end;
  else
    select role into submitter_role from public.profiles where id = new.requested_by;
    if submitter_role not in ('lgu_headmaster', 'lgu_frontliner') then return new; end if;
    event_name := 'lgu_utility_request';
    event_id := new.request_id;
    heading := 'New Utilities Request';
    -- Mobile request details may be stored in request_reason rather than dedicated columns.
    resource_name := coalesce(nullif(btrim(to_jsonb(new)->>'resource_type'), ''),
      nullif(btrim(to_jsonb(new)->>'utility_type'), ''),
      nullif(btrim(to_jsonb(new)->>'request_reason'), ''), 'utilities');
    urgency_name := coalesce(nullif(btrim(to_jsonb(new)->>'urgency'), ''),
      nullif(btrim(to_jsonb(new)->>'priority'), ''),
      (regexp_match(coalesce(to_jsonb(new)->>'request_reason', ''),
        '(?i)(?:urgency|priority)(?:\s+level)?\s*[:=\-]\s*(low|medium|high)'))[1]);
  end if;

  select m.name, m.province_id into municipality_name, province
  from public.municipality_or_city m where m.municipality_id = new.municipality_id;
  if province is null then return new; end if;

  if event_name = 'citizen_report' then
    body := 'A new ' || report_name || ' report has been submitted by a citizen from ' || municipality_name || '.';
  elsif event_name = 'lgu_report' then
    body := municipality_name || ' LGU submitted a new ' || report_name || ' report.';
  else
    body := municipality_name || ' LGU submitted a new request for ' || resource_name || '.' ||
      case when urgency_name is null then '' else ' Urgency: ' || urgency_name || '.' end;
  end if;

  for recipient in select id from public.profiles
    where role = 'provincial_admin' and province_id = province
  loop
    insert into public.notifications
      (user_id, title, message, type, target_role, source_event, source_id)
    values (recipient.id, heading, body,
      case when event_name = 'lgu_utility_request' then 'Requests' else 'Reports' end,
      'provincial_admin', event_name, event_id)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

create trigger notify_provincial_incident_submission
  after insert on public.incident_report
  for each row execute function public.notify_provincial_submission();
create trigger notify_provincial_utility_submission
  after insert on public.resource_requests
  for each row execute function public.notify_provincial_submission();

-- Request items are submitted after the request header by the mobile workflow.
-- Fill in the actual utility names once those items exist.
create or replace function public.refresh_provincial_utility_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  utility_names text;
  municipality_name text;
  urgency_name text;
begin
  select string_agg(distinct u.name, ', ' order by u.name) into utility_names
  from public.resource_request_items i
  join public.utilities u on u.utilities_id = i.utilities_id
  where i.request_id = new.request_id;
  if utility_names is null then return new; end if;
  select m.name,
    coalesce(nullif(btrim(to_jsonb(r)->>'urgency'), ''),
      nullif(btrim(to_jsonb(r)->>'priority'), ''),
      (regexp_match(coalesce(r.request_reason, ''),
        '(?i)(?:urgency|priority)(?:\s+level)?\s*[:=\-]\s*(low|medium|high)'))[1])
    into municipality_name, urgency_name
  from public.resource_requests r
  join public.municipality_or_city m on m.municipality_id = r.municipality_id
  where r.request_id = new.request_id;
  update public.notifications n
  set message = municipality_name || ' LGU submitted a new request for ' || utility_names || '.' ||
    case when urgency_name is null then '' else ' Urgency: ' || urgency_name || '.' end
  where n.source_event = 'lgu_utility_request' and n.source_id = new.request_id;
  return new;
end;
$$;

create trigger refresh_provincial_utility_notification
  after insert on public.resource_request_items
  for each row execute function public.refresh_provincial_utility_notification();

-- A restrictive policy also applies when an older permissive notification policy exists.
create policy provincial_submission_recipient_only on public.notifications
  as restrictive for all to authenticated
  using (source_event not in ('citizen_report', 'lgu_report', 'lgu_utility_request')
    or source_event is null
    or (user_id = auth.uid() and target_role = 'provincial_admin'
      and exists (select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'provincial_admin'
          and p.province_id = case
            when source_event in ('citizen_report', 'lgu_report') then
              (select m.province_id from public.incident_report r
                join public.municipality_or_city m on m.municipality_id = r.municipality_id
                where r.report_id = source_id)
            else (select m.province_id from public.resource_requests r
                join public.municipality_or_city m on m.municipality_id = r.municipality_id
                where r.request_id = source_id) end)))
  with check (source_event not in ('citizen_report', 'lgu_report', 'lgu_utility_request')
    or source_event is null
    or (user_id = auth.uid() and target_role = 'provincial_admin'
      and exists (select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'provincial_admin')));

create policy provincial_submission_read on public.notifications
  for select to authenticated using (
    source_event in ('citizen_report', 'lgu_report', 'lgu_utility_request')
    and user_id = auth.uid());
