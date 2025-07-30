-- Returns all daily_ride_statistics rows where avg_wait_time_minutes = 0
-- and any hourly_data element has avg > 0

-- Custom type for limited daily_ride_statistics columns
drop type if exists public.daily_ride_statistics_limited cascade;

create type public.daily_ride_statistics_limited as (
  id uuid,
  date date,
  avg_wait_time_minutes numeric(5,2)
);

create or replace function public.find_daily_stats_zero_avg_with_hourly_gt_zero()
returns setof daily_ride_statistics_limited
language sql
stable
as $$
  select id, date, avg_wait_time_minutes
  from daily_ride_statistics
  where coalesce(avg_wait_time_minutes, 0) = 0
    and exists (
      select 1
      from jsonb_array_elements(hourly_data) as elem
      where (elem->>'avg') is not null
        and (elem->>'avg')::numeric > 0
    );
$$;
