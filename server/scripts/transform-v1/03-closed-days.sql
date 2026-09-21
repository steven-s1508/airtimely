-- v1 -> v2, part 3: ride-days on which the ride never operated.
--
-- Runs after the rollup, which only produces rows for rides that have hourly buckets.
-- These days still matter: with a schedule they are 0% uptime and a full day of
-- downtime (a ride closed through park hours), which the uptime charts must show.
--
-- The mapping is exact against what rollup.sql would compute: with no operating
-- minutes, v1's downtime_minutes was round(scheduled minutes - 0), i.e. the scheduled
-- minutes themselves, and NULL when the day had no schedule. Every wait statistic is
-- NULL, per "nothing operated".

insert into ride_stats_daily (ride_id, local_date, operating_min, down_min, scheduled_min)
select d.ride_id, d.date, 0, d.downtime_minutes, d.downtime_minutes
from v1.daily_ride_statistics d
where not exists (
	select 1 from ride_stats_daily n
	where n.ride_id = d.ride_id and n.local_date = d.date
);
