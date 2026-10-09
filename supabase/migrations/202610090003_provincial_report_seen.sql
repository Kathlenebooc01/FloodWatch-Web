CREATE TABLE IF NOT EXISTS public.provincial_report_seen (
  admin_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL
);

ALTER TABLE public.provincial_report_seen ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.provincial_report_seen TO authenticated;

DROP POLICY IF EXISTS "Provincial admins read own report seen time" ON public.provincial_report_seen;
DROP POLICY IF EXISTS "Provincial admins insert own report seen time" ON public.provincial_report_seen;
DROP POLICY IF EXISTS "Provincial admins update own report seen time" ON public.provincial_report_seen;

CREATE POLICY "Provincial admins read own report seen time"
  ON public.provincial_report_seen FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provincial_admin'
  ));

CREATE POLICY "Provincial admins insert own report seen time"
  ON public.provincial_report_seen FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provincial_admin'
  ));

CREATE POLICY "Provincial admins update own report seen time"
  ON public.provincial_report_seen FOR UPDATE TO authenticated
  USING (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provincial_admin'
  ))
  WITH CHECK (admin_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_provincial_reports_seen()
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE seen_at timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provincial_admin'
  ) THEN
    RAISE EXCEPTION 'Only provincial admins may mark reports seen' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.provincial_report_seen (admin_id, viewed_at)
  VALUES (auth.uid(), seen_at)
  ON CONFLICT (admin_id) DO UPDATE SET viewed_at = GREATEST(public.provincial_report_seen.viewed_at, EXCLUDED.viewed_at);
  RETURN seen_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_provincial_reports_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_provincial_reports_seen() TO authenticated;
