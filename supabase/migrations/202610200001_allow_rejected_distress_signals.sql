-- Provincial Admin rejection stores Rejected on the selected distress signal.
-- Preserve every status already permitted by the deployed constraint.
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
      existing_check, 'Rejected');
  end if;
end;
$$;
