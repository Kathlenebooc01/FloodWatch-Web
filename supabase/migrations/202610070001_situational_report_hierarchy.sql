BEGIN;

-- The checked-in incident_report schema has no existing parent relationship.
ALTER TABLE public.incident_report
  ADD COLUMN IF NOT EXISTS parent_report_id uuid
  REFERENCES public.incident_report(report_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS incident_report_parent_report_id_idx
  ON public.incident_report(parent_report_id);

CREATE OR REPLACE FUNCTION public.enforce_situational_report_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  parent public.incident_report%ROWTYPE;
  visited uuid[] := ARRAY[NEW.report_id];
  actor_role text;
  actor_municipality uuid;
  situational boolean;
BEGIN
  situational := NEW.parent_report_id IS NOT NULL
    OR lower(coalesce(NEW.hazard_type, '')) LIKE '%situational%'
    OR lower(coalesce(NEW.description, '')) LIKE '%situational%'
    OR lower(coalesce(NEW.description, '')) LIKE '%field status%';
  IF TG_OP = 'UPDATE' THEN
    situational := situational OR OLD.parent_report_id IS NOT NULL
      OR lower(coalesce(OLD.hazard_type, '')) LIKE '%situational%'
      OR lower(coalesce(OLD.description, '')) LIKE '%situational%'
      OR lower(coalesce(OLD.description, '')) LIKE '%field status%';
  END IF;

  -- Existing RLS still applies. Also prevent LGUs from self-verifying a report.
  IF situational AND auth.uid() IS NOT NULL THEN
    SELECT role, municipality_id INTO actor_role, actor_municipality
      FROM public.profiles WHERE id = auth.uid();
    IF coalesce(actor_role, '') NOT IN ('provincial_admin', 'national_admin') THEN
      IF TG_OP = 'INSERT' THEN
        IF coalesce(actor_role, '') NOT IN ('lgu_headmaster', 'lgu_frontliner')
          OR NEW.user_id IS DISTINCT FROM auth.uid()
          OR NEW.municipality_id IS DISTINCT FROM actor_municipality THEN
          RAISE EXCEPTION 'Situational reports must be submitted by an LGU in its municipality' USING ERRCODE = '42501';
        END IF;
        IF lower(coalesce(NEW.status, 'pending')) NOT IN ('pending', 'pending_ai')
          OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
          RAISE EXCEPTION 'Only PDRRMO/Admin may review a situational report' USING ERRCODE = '42501';
        END IF;
      ELSIF NEW.status IS DISTINCT FROM OLD.status
        OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
        OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
        RAISE EXCEPTION 'Only PDRRMO/Admin may review a situational report' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF situational AND NEW.parent_report_id IS NULL
      AND lower(coalesce(NEW.hazard_type, '')) NOT LIKE '%situational%'
      AND lower(coalesce(NEW.description, '')) NOT LIKE '%situational%'
      AND lower(coalesce(NEW.description, '')) NOT LIKE '%field status%' THEN
      RAISE EXCEPTION 'Main report must remain a situational report' USING ERRCODE = '23514';
    END IF;
    IF NEW.parent_report_id IS DISTINCT FROM OLD.parent_report_id
      OR NEW.municipality_id IS DISTINCT FROM OLD.municipality_id
      OR NEW.report_id IS DISTINCT FROM OLD.report_id THEN
      RAISE EXCEPTION 'Report identity, municipality and parent cannot be changed' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_report_id IS NULL THEN RETURN NEW; END IF;
  -- Resolve an update ID to its original root; all new updates become siblings.
  LOOP
    IF NEW.parent_report_id = ANY(visited) THEN
      RAISE EXCEPTION 'Report relationship contains a cycle' USING ERRCODE = '23514';
    END IF;
    visited := array_append(visited, NEW.parent_report_id);
    SELECT * INTO parent FROM public.incident_report
      WHERE report_id = NEW.parent_report_id FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Main report does not exist' USING ERRCODE = '23503';
    END IF;
    EXIT WHEN parent.parent_report_id IS NULL;
    NEW.parent_report_id := parent.parent_report_id;
  END LOOP;

  IF lower(coalesce(parent.status, '')) <> 'verified' THEN
    RAISE EXCEPTION 'Main report must be verified by PDRRMO/Admin before linking an update' USING ERRCODE = '23514';
  END IF;
  IF parent.municipality_id IS DISTINCT FROM NEW.municipality_id THEN
    RAISE EXCEPTION 'Update must belong to the main report municipality' USING ERRCODE = '23514';
  END IF;
  IF lower(coalesce(parent.hazard_type, '')) NOT LIKE '%situational%'
    AND lower(coalesce(parent.description, '')) NOT LIKE '%situational%'
    AND lower(coalesce(parent.description, '')) NOT LIKE '%field status%' THEN
    RAISE EXCEPTION 'Parent must be a main situational report' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_situational_report_hierarchy ON public.incident_report;
CREATE TRIGGER enforce_situational_report_hierarchy
  BEFORE INSERT OR UPDATE ON public.incident_report
  FOR EACH ROW EXECUTE FUNCTION public.enforce_situational_report_hierarchy();

COMMIT;
