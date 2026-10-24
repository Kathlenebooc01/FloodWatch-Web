-- Restore geographic scope only where an accepted invitation resolves uniquely.
with provincial_matches as (
  select p.id, min(v.province_id::text)::uuid as province_id
  from public.profiles p
  join public.invitations i
    on lower(i.official_email) = lower(p.email)
   and i.account_role = 'provincial_admin'
   and i.status = 'accepted'
  join public.province v on lower(btrim(v.name)) = lower(btrim(i.lgu_name))
  where p.role = 'provincial_admin' and p.province_id is null
  group by p.id
  having count(distinct v.province_id) = 1
)
update public.profiles p set province_id = m.province_id
from provincial_matches m where p.id = m.id and p.province_id is null;

update public.profiles p set province_id = m.province_id
from public.municipality_or_city m
where p.role = 'lgu_headmaster'
  and p.province_id is null
  and p.municipality_id = m.municipality_id;
