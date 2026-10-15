ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS escalation_report_id uuid REFERENCES public.incident_report(report_id);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_escalation_verification
  ON public.notifications(escalation_report_id)
  WHERE escalation_report_id IS NOT NULL AND title = 'Escalation Verified';

CREATE OR REPLACE FUNCTION public.verify_support_escalation(escalation_id uuid)
RETURNS public.incident_report
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result public.incident_report;
  admin_province public.profiles.province_id%TYPE;
BEGIN
  SELECT province_id INTO admin_province FROM public.profiles
  WHERE id = auth.uid() AND role = 'provincial_admin';
  IF admin_province IS NULL THEN
    RAISE EXCEPTION 'Provincial admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT ir.* INTO result
  FROM public.incident_report ir
  JOIN public.municipality_or_city m ON m.municipality_id = ir.municipality_id
  WHERE ir.report_id = escalation_id AND m.province_id = admin_province
  FOR UPDATE OF ir;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Support escalation not found in your province' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    lower(coalesce(result.hazard_type, '')) LIKE '%escalat%'
    OR lower(coalesce(result.report_type, '')) LIKE '%escalat%'
    OR lower(coalesce(result.description, '')) LIKE '%support escalation%'
  ) THEN
    RAISE EXCEPTION 'Report is not a support escalation' USING ERRCODE = '22023';
  END IF;
  IF lower(result.status) = 'verified' THEN
    RETURN result;
  END IF;
  IF lower(result.status) NOT IN ('pending', 'pending_ai', 'submitted') THEN
    RAISE EXCEPTION 'Support escalation cannot be accepted from its current status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.incident_report SET
    status = 'Verified',
    acknowledged_at = now(), acknowledged_by = auth.uid(),
    reviewed_at = now(), reviewed_by = auth.uid()
  WHERE report_id = escalation_id
  RETURNING * INTO result;

  IF result.user_id IS NOT NULL THEN
    INSERT INTO public.notifications
      (user_id, title, message, type, target_role, escalation_report_id)
    VALUES
      (result.user_id, 'Escalation Verified',
       'Your support escalation request has been accepted and verified by the Provincial Admin (PDRRMO).',
       'Updates', 'lgu', escalation_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_support_escalation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_support_escalation(uuid) TO authenticated;
