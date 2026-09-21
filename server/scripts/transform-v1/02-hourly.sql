-- v1 -> v2, part 2: daily_ride_statistics.hourly_data -> ride_stats_hourly.
--
-- Run once per date range by the runner: $1 from (inclusive), $2 to (exclusive).
--
-- Each hourly_data element is {h, avg, avg_s, min, max, op, data}. After patches
-- _02.._06, `avg` is the mean over OPERATING samples and `op` the operating minutes of
-- the hour, so the minute-weighted form is exact up to rounding:
--   wait_minutes = op, wait_sum = round(avg * op)
--
-- Only hours in which the ride operated are carried. The other ~77% of v1's hour
-- entries are closed hours with no values at all; for historic days down_min and
-- closed_min were never recorded, so such a row says nothing and the rollup gives it no
-- weight. A day on which the ride never operated keeps its daily row (part 3).
--
-- Hours with op = 0 but a stale avg (1,877 of them) are not carried either: v1 excluded
-- them from every statistic, and "only OPERATING time counts" is the rule.
--
-- bucket_start is the instant the park-local hour begins, from v1's park timezone. The
-- repeated autumn-DST hour resolves to a single instant, which is what v1 had: one row.
-- A spring-gap hour would collide with the next one on the primary key; none exist in
-- v1 (checked), and the plain INSERT fails loudly if that ever changes.
--
-- down_min, closed_min and scheduled_min stay NULL for historic rows.

insert into ride_stats_hourly (
	ride_id, bucket_start, local_date, local_hour,
	operating_min, wait_minutes, wait_sum, wait_min, wait_max, single_mean
)
select
	d.ride_id,
	(d.date + make_interval(hours => h.h))::timestamp at time zone p.timezone,
	d.date,
	h.h,
	h.op,
	case when h.avg is not null then h.op else 0 end,
	case when h.avg is not null then round(h.avg * h.op)::int end,
	h.min,
	h.max,
	h.avg_s
from v1.daily_ride_statistics d
join rides r on r.id = d.ride_id
join parks p on p.id = r.park_id
cross join lateral jsonb_to_recordset(d.hourly_data) as h(
	h int, avg numeric, avg_s numeric, min int, max int, op int, data int
)
where d.date >= $1::date and d.date < $2::date
	and coalesce(h.op, 0) > 0;
