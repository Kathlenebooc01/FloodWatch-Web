-- Existing individual utility records remain unchanged (both columns are nullable).
alter table public.utilities
  add column if not exists registration_batch_id uuid,
  add column if not exists registration_item_index integer;

create unique index if not exists utilities_registration_batch_item_unique
  on public.utilities(registration_batch_id, registration_item_index)
  where registration_batch_id is not null;
