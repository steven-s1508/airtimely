create view public.displayable_destinations as
select
  p.id as entity_id,
  COALESCE(p.name_override, p.name) as name,
  p.slug,
  'park'::text as entity_type,
  p.country_code,
  p.latitude,
  p.longitude,
  p.timezone,
  p.id as park_id,
  p.destination_id as original_destination_id,
  null::uuid as chain_id,
  null::text as website
from
  parks p
where
  p.is_destination = true
union all
select
  d.id as entity_id,
  COALESCE(d.name_override, d.name) as name,
  d.slug,
  'destination_group'::text as entity_type,
  d.country_code,
  d.latitude,
  d.longitude,
  d.timezone,
  null::uuid as park_id,
  d.id as original_destination_id,
  d.chain_id,
  d.website
from
  destinations d
where
  (
    exists (
      select
        1
      from
        parks p_assoc
      where
        p_assoc.destination_id = d.id
    )
  )
  and not (
    exists (
      select
        1
      from
        parks p_check
      where
        p_check.destination_id = d.id
        and p_check.is_destination = true
    )
  );