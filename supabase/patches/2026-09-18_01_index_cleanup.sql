-- =====================================================================================
-- Index cleanup and bloat removal (2026-09-18)
--
-- Run each statement ON ITS OWN (not as one script): CONCURRENTLY cannot run inside a
-- transaction block, and some SQL clients wrap multi-statement runs in one.
-- Nothing here locks tables for writes; the Windmill jobs can keep running.
-- REINDEX temporarily needs free disk space roughly equal to the index being rebuilt.
-- =====================================================================================

-- 1. Refresh planner statistics (most tables currently have none: n_live_tup = 0)
analyze;

-- 2. Unused or duplicate indexes (sizes/usage from pg_stat_user_indexes on 2026-09-18)
drop index concurrently if exists public.idx_ride_wait_times_api_last_updated;      -- 61 MB, 0 scans
drop index concurrently if exists public.idx_ride_wait_times_status;                -- 50 MB, 0 scans
drop index concurrently if exists public.idx_hourly_ride_stats_ride_date_hour;      -- 142 MB, same columns as the unique key
drop index concurrently if exists public.idx_daily_ride_stats_ride_date;            -- 101 MB, same columns as the unique key
drop index concurrently if exists public.idx_daily_ride_statistics_hourly_data_gin; -- 100 MB, 0 scans

-- 3. Rebuild the remaining, heavily bloated indexes (constant delete churn)
reindex table concurrently public.ride_wait_times;
reindex table concurrently public.hourly_ride_statistics;
reindex table concurrently public.daily_ride_statistics;

-- 4. Check the result
select relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_size_pretty(pg_indexes_size(relid))        as index_size
  from pg_stat_user_tables
 where schemaname = 'public'
 order by pg_total_relation_size(relid) desc;
