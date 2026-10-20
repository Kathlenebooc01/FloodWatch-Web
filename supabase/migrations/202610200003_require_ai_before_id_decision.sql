-- Require a saved, complete AI assessment before an ID decision.
CREATE OR REPLACE FUNCTION public.decide_id_verification(
  verification_id uuid,
  decision text
) RETURNS public.id_verification
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  request_row public.id_verification%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'national_admin'
  ) THEN
    RAISE EXCEPTION 'National Admin access required';
  END IF;
  IF decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification decision';
  END IF;

  SELECT * INTO request_row FROM public.id_verification
  WHERE id_verification_id = verification_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;
  IF lower(coalesce(request_row.status, 'pending')) <> 'pending' THEN
    RAISE EXCEPTION 'Verification request has already been reviewed';
  END IF;
  IF request_row.ai_is_valid IS NULL OR request_row.ai_confidence_score IS NULL
     OR nullif(btrim(request_row.ai_insight), '') IS NULL THEN
    RAISE EXCEPTION 'AI verification must complete before a decision';
  END IF;

  PERFORM set_config('app.id_verification_decision', 'true', true);
  UPDATE public.id_verification
  SET status = decision, reviewed_by = auth.uid()
  WHERE id_verification_id = verification_id
  RETURNING * INTO request_row;

  UPDATE public.profiles
  SET is_verified = (decision = 'approved')
  WHERE id = request_row.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Citizen profile not found';
  END IF;
  RETURN request_row;
END;
$$;
