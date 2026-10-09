ALTER TABLE public.incident_report
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.acknowledge_report_update(update_id uuid)
RETURNS public.incident_report
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result public.incident_report;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'provincial_admin'
  ) THEN
    RAISE EXCEPTION 'Only a provincial admin may acknowledge an update' USING ERRCODE = '42501';
  END IF;

  UPDATE public.incident_report
  SET acknowledged_at = now(), acknowledged_by = auth.uid()
  WHERE report_id = update_id
    AND parent_report_id IS NOT NULL
    AND acknowledged_at IS NULL
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Update does not exist or is already acknowledged' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_report_update(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_report_update(uuid) TO authenticated;
