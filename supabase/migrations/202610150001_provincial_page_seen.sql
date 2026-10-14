CREATE TABLE IF NOT EXISTS public.provincial_page_seen (
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key text NOT NULL CHECK (page_key IN ('lgu', 'request', 'notification')),
  viewed_at timestamptz NOT NULL,
  PRIMARY KEY (admin_id, page_key)
);

ALTER TABLE public.provincial_page_seen ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.provincial_page_seen TO authenticated;

CREATE POLICY "Provincial admins read own page seen times"
  ON public.provincial_page_seen FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provincial_admin'
  ));

CREATE OR REPLACE FUNCTION public.mark_provincial_page_seen(p_page_key text)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE seen_at timestamptz := clock_timestamp();
BEGIN
  IF p_page_key NOT IN ('lgu', 'request', 'notification') OR p_page_key IS NULL THEN
    RAISE EXCEPTION 'Invalid page key' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provincial_admin'
  ) THEN
    RAISE EXCEPTION 'Only provincial admins may mark pages seen' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.provincial_page_seen (admin_id, page_key, viewed_at)
  VALUES (auth.uid(), p_page_key, seen_at)
  ON CONFLICT (admin_id, page_key) DO UPDATE
    SET viewed_at = GREATEST(public.provincial_page_seen.viewed_at, EXCLUDED.viewed_at);
  RETURN seen_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_provincial_page_seen(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_provincial_page_seen(text) TO authenticated;
