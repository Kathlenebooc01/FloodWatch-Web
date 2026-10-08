-- An AI assessment never changes the citizen's verification state.
ALTER TABLE public.id_verification ALTER COLUMN status SET DEFAULT 'pending';

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
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'national_admin'
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

CREATE OR REPLACE FUNCTION public.guard_id_verification_decision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('app.id_verification_decision', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Use the National Admin verification decision action';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_id_verification_decision
BEFORE INSERT OR UPDATE ON public.id_verification
FOR EACH ROW EXECUTE FUNCTION public.guard_id_verification_decision();

CREATE OR REPLACE FUNCTION public.guard_citizen_verified_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role = 'citizen' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND current_setting('app.id_verification_decision', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Use the National Admin verification decision action';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_citizen_verified_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_citizen_verified_status();

CREATE OR REPLACE FUNCTION public.reset_verification_on_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.id_verification_decision', 'true', true);
  UPDATE public.profiles SET is_verified = false WHERE id = NEW.user_id AND role = 'citizen';
  RETURN NEW;
END;
$$;

CREATE TRIGGER reset_verification_on_submission
AFTER INSERT ON public.id_verification
FOR EACH ROW EXECUTE FUNCTION public.reset_verification_on_submission();

REVOKE ALL ON FUNCTION public.decide_id_verification(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_id_verification(uuid, text) TO authenticated;
