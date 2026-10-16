-- Remove the earlier compatibility bridge. Monitoring must include only
-- escalations submitted directly to distress_signals.
drop trigger if exists sync_new_lgu_escalation_to_distress on public.incident_report;
drop trigger if exists sync_lgu_escalation_status_to_distress on public.incident_report;
drop function if exists public.sync_lgu_escalation_to_distress();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'distress_signals'
      and column_name = 'source_report_id'
  ) then
    delete from public.distress_signals where source_report_id is not null;
    alter table public.distress_signals drop column source_report_id;
  end if;
end;
$$;
