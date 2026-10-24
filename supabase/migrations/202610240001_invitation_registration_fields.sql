-- Keep full_name for existing profile displays and add structured names for new invitations.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text;
