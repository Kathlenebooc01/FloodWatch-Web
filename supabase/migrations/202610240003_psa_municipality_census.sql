create table if not exists public.municipality_census_statistics (
  municipality_id uuid primary key references public.municipality_or_city(municipality_id) on delete cascade,
  census_year integer not null default 2024 check (census_year = 2024),
  total_population bigint not null check (total_population >= 0),
  household_population bigint not null check (household_population >= 0),
  number_of_households bigint not null check (number_of_households >= 0),
  psa_geographic_code text not null,
  psa_geographic_name text not null,
  source text not null default 'PSA 2024 Census of Population',
  last_synced_at timestamptz not null
);

alter table public.municipality_census_statistics enable row level security;

create policy census_statistics_national_admin_read
  on public.municipality_census_statistics for select to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'national_admin'
  ));
