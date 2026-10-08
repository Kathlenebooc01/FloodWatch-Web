ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS municipality_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invitations_municipality_id_fkey'
      AND conrelid = 'public.invitations'::regclass
  ) THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT invitations_municipality_id_fkey
      FOREIGN KEY (municipality_id)
      REFERENCES public.municipality_or_city(municipality_id);
  END IF;
END $$;
