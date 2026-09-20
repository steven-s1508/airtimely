-- =====================================================================================
-- Recompute historical daily statistics + clean up leftover hourly rows (2026-09-18)
--
-- Requires patch 02 (upsert_daily_from_hourly_json).
-- Every daily row keeps its full 24-hour `hourly_data`, so the corrected daily figures
-- can be rebuilt from it for the whole history. Old parks_schedule rows (back to
-- 2025-06) provide the park hours; days without a schedule get NULL uptime/downtime.
-- =====================================================================================


-- STEP 1 — Backup (run once). Plain copy without indexes; drop it once you are happy.
create table if not exists public.daily_ride_statistics_backup_20260918 as
select * from public.daily_ride_statistics;

revoke all on public.daily_ride_statistics_backup_20260918 from anon, authenticated;


-- STEP 2 — Helper that recomputes a date range. Returns the number of rows recomputed.
create or replace function public.recompute_daily_stats(p_from date, p_to date)
returns integer
language plpgsql
as $$
declare
    r       record;
    v_count integer := 0;
begin
    for r in
        select ride_id, date, hourly_data
          from daily_ride_statistics
         where date between p_from and p_to
           and hourly_data is not null
    loop
        perform upsert_daily_from_hourly_json(r.ride_id, r.date, r.hourly_data);
        v_count := v_count + 1;
    end loop;
    return v_count;
end;
$$;

revoke all on function public.recompute_daily_stats(date, date) from public, anon, authenticated;
grant execute on function public.recompute_daily_stats(date, date) to service_role;


-- STEP 3 — Recompute month by month (each call is one transaction; a month is
-- roughly 150–200k rows, expect minutes per month). Run one line at a time.
select recompute_daily_stats('2025-06-01', '2025-06-30');
select recompute_daily_stats('2025-07-01', '2025-07-31');
select recompute_daily_stats('2025-08-01', '2025-08-31');
select recompute_daily_stats('2025-09-01', '2025-09-30');
select recompute_daily_stats('2025-10-01', '2025-10-31');
select recompute_daily_stats('2025-11-01', '2025-11-30');
select recompute_daily_stats('2025-12-01', '2025-12-31');
select recompute_daily_stats('2026-01-01', '2026-01-31');
select recompute_daily_stats('2026-02-01', '2026-02-28');
select recompute_daily_stats('2026-03-01', '2026-03-31');
select recompute_daily_stats('2026-04-01', '2026-04-30');
select recompute_daily_stats('2026-05-01', '2026-05-31');
select recompute_daily_stats('2026-06-01', '2026-06-30');
select recompute_daily_stats('2026-07-01', '2026-07-31');
select recompute_daily_stats('2026-08-01', '2026-08-31');
select recompute_daily_stats('2026-09-01', '2026-09-13');


-- STEP 4 — Compare before/after (Space Mountain, last days before the outage)
select b.date,
       b.avg_wait_time_minutes  as avg_before,  d.avg_wait_time_minutes  as avg_after,
       b.operational_percentage as op_before,   d.operational_percentage as op_after,
       b.downtime_minutes       as down_before, d.downtime_minutes       as down_after,
       b.peak_wait_time_hour    as peak_before, d.peak_wait_time_hour    as peak_after
  from daily_ride_statistics_backup_20260918 b
  join daily_ride_statistics d on d.ride_id = b.ride_id and d.date = b.date
 where b.ride_id = (select id from rides where external_id = 'b2260923-9315-40fd-9c6b-44dd811dbe64')
   and b.date between '2026-09-01' and '2026-09-13'
 order by b.date;


-- STEP 5 — Leftover hourly rows (never deleted after daily aggregation).
-- 5a: are they already contained in the daily row's hourly_data? (read-only)
select count(*) as leftover_rows,
       count(*) filter (where d.ride_id is null) as without_daily_row,
       count(*) filter (where exists (select 1
                                        from jsonb_array_elements(d.hourly_data) e
                                       where (e->>'h')::int = h.hour)) as already_in_hourly_data
  from hourly_ride_statistics h
  left join daily_ride_statistics d on d.ride_id = h.ride_id and d.date = h.date
 where h.date <= '2026-09-13';

-- 5b: ONLY if already_in_hourly_data = leftover_rows in 5a: delete the redundant copies
-- delete from hourly_ride_statistics h
--  using daily_ride_statistics d
--  where d.ride_id = h.ride_id
--    and d.date = h.date
--    and h.date <= '2026-09-13'
--    and exists (select 1 from jsonb_array_elements(d.hourly_data) e where (e->>'h')::int = h.hour);

-- 5c: afterwards, give the space back (takes a brief exclusive lock; seconds at this size)
-- vacuum full public.hourly_ride_statistics;
