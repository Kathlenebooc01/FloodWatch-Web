-- Keep Distress Signals visits separate from LGU report visits.
alter table public.provincial_page_seen
  drop constraint if exists provincial_page_seen_page_key_check;
alter table public.provincial_page_seen
  add constraint provincial_page_seen_page_key_check
  check (page_key in ('lgu', 'request', 'notification', 'distress'));

create or replace function public.mark_provincial_page_seen(p_page_key text)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp as $$
declare seen_at timestamptz := clock_timestamp();
begin
  if p_page_key not in ('lgu', 'request', 'notification', 'distress') or p_page_key is null then
    raise exception 'Invalid page key' using errcode = '22023';
  end if;
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'provincial_admin'
  ) then
    raise exception 'Only provincial admins may mark pages seen' using errcode = '42501';
  end if;
  insert into public.provincial_page_seen (admin_id, page_key, viewed_at)
  values (auth.uid(), p_page_key, seen_at)
  on conflict (admin_id, page_key) do update
    set viewed_at = greatest(public.provincial_page_seen.viewed_at, excluded.viewed_at);
  return seen_at;
end;
$$;

revoke all on function public.mark_provincial_page_seen(text) from public;
grant execute on function public.mark_provincial_page_seen(text) to authenticated;
