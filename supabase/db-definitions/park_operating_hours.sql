drop table if exists public.park_operating_hours cascade;
drop view if exists public.park_operating_hours cascade;

create view public.park_operating_hours as
select
  ps.park_id,
  ps.date,
  ps.type,
  ps.opening_time::timestamptz as opening_time,
  ps.closing_time::timestamptz as closing_time,
  ps.created_at,
  ps.updated_at
from public.parks_schedule ps
where ps.type = 'OPERATING';
