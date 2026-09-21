-- Rolls ride_stats_hourly up into ride_stats_daily for one park-day.
--
-- Ported from upsert_daily_from_hourly_json() as it stands in
-- supabase/patches/2026-09-19_05_operating_only_hourly_data.sql. Patch _02's earlier
-- version differs in exactly the places that matter (it had an avg() fallback that
-- reintroduced closed-day zeros) -- do not port from db-functions/, which has drifted.
--
-- Parameters:
--   $1 park_id uuid
--   $2 local_date date
--   $3 wait_dist jsonb  -- { ride_id: { wait_value: minutes } }, '{}' for historic days
--
-- Rules that must not be lost:
--   * The park-local day is a range of real instants, derived per park timezone.
--   * Schedule windows come from local_date AND local_date - 1, so a window running
--     past midnight counts. (The inverse trap lives elsewhere: selecting days that
--     have NO schedule must look at the day's own entry only.)
--   * Partial hours count clipped to their overlap with an operating window.
--   * No schedule => uptime and downtime are NULL. Unknown, never guessed, never 0.
--   * Nothing operated => every wait statistic is NULL, never 0.
--   * Flat day => no peak hour and no quietest hour.

WITH park AS (
	SELECT id, coalesce(timezone, 'UTC') AS tz
	FROM parks
	WHERE id = $1::uuid
),
day AS (
	SELECT
		park.id AS park_id,
		park.tz,
		tstzrange(
			($2::date)::timestamp AT TIME ZONE park.tz,
			($2::date + 1)::timestamp AT TIME ZONE park.tz
		) AS span
	FROM park
),
-- Operating windows clipped to the day.
windows AS (
	SELECT tstzrange(ps.opening_time, ps.closing_time) * day.span AS w
	FROM parks_schedule ps
	CROSS JOIN day
	WHERE ps.park_id = day.park_id
		AND ps.type = 'OPERATING'
		AND ps.opening_time IS NOT NULL
		AND ps.closing_time IS NOT NULL
		AND ps.opening_time < ps.closing_time
		AND ps.local_date BETWEEN $2::date - 1 AND $2::date
		AND tstzrange(ps.opening_time, ps.closing_time) && day.span
),
sched AS (
	SELECT
		EXISTS (SELECT 1 FROM windows) AS has_sched,
		coalesce((
			SELECT sum(extract(epoch FROM (upper(w) - lower(w))) / 60)
			FROM windows WHERE NOT isempty(w)
		), 0) AS sched_min
),
-- Each bucket is keyed by an instant, so the repeated hour on the autumn DST change
-- stays two rows. Never group these by local_hour.
hours AS (
	SELECT
		h.ride_id,
		h.bucket_start,
		h.local_hour,
		coalesce(h.operating_min, 0) AS operating_min,
		h.wait_minutes,
		h.wait_sum,
		h.wait_min,
		h.wait_max,
		h.single_mean,
		tstzrange(h.bucket_start, h.bucket_start + interval '1 hour') AS hr
	FROM ride_stats_hourly h
	JOIN rides r ON r.id = h.ride_id
	WHERE r.park_id = $1::uuid AND h.local_date = $2::date
),
scored AS (
	SELECT
		hours.*,
		coalesce((
			SELECT sum(extract(epoch FROM (upper(w * hours.hr) - lower(w * hours.hr))) / 60)
			FROM windows
			WHERE NOT isempty(w * hours.hr)
		), 0) AS sched_overlap
	FROM hours
),
counted AS (
	SELECT
		s.*,
		sched.has_sched,
		sched.sched_min,
		-- Whether this bucket counts toward the day. Kept as a flag rather than a WHERE
		-- so that a ride whose every hour is excluded still produces a daily row, with
		-- NULL statistics. v1 did the same, and "nothing operated" must read as unknown
		-- rather than as an absent row.
		CASE
			WHEN sched.has_sched THEN s.sched_overlap > 0
			ELSE s.operating_min > 0
		END AS counts,
		least(s.operating_min, CASE WHEN sched.has_sched THEN s.sched_overlap ELSE 60 END) AS op_in,
		-- Wait-carrying minutes, clipped the same way, with the hour's total scaled to
		-- match. Same uniform-within-the-hour assumption v1 made.
		CASE
			WHEN sched.has_sched THEN least(coalesce(s.wait_minutes, 0), s.sched_overlap)
			ELSE coalesce(s.wait_minutes, 0)
		END AS wait_min_in
	FROM scored s
	CROSS JOIN sched
),
weighted AS (
	SELECT
		c.*,
		CASE
			WHEN coalesce(c.wait_minutes, 0) > 0
			THEN c.wait_sum::numeric * c.wait_min_in / c.wait_minutes
		END AS wait_sum_in,
		CASE
			WHEN coalesce(c.wait_minutes, 0) > 0
			THEN c.wait_sum::numeric / c.wait_minutes
		END AS hour_mean
	FROM counted c
),
agg AS (
	SELECT
		w.ride_id,
		bool_or(w.has_sched) AS has_sched,
		max(w.sched_min) AS sched_min,
		coalesce(sum(w.op_in) FILTER (WHERE w.counts), 0) AS op_minutes,
		sum(w.wait_min_in) FILTER (WHERE w.counts AND w.op_in > 0 AND w.hour_mean IS NOT NULL)
			AS wait_minutes,
		sum(w.wait_sum_in) FILTER (WHERE w.counts AND w.op_in > 0 AND w.hour_mean IS NOT NULL)
			AS wait_sum,
		min(w.wait_min) FILTER (WHERE w.counts AND w.op_in > 0) AS wait_min,
		max(w.wait_max) FILTER (WHERE w.counts AND w.op_in > 0) AS wait_max,
		-- A flat day has no peak: every counted hour shares the same mean.
		(max(w.hour_mean) FILTER (WHERE w.counts AND w.op_in > 0)
			> min(w.hour_mean) FILTER (WHERE w.counts AND w.op_in > 0)) AS has_peak,
		-- bucket_start breaks ties deterministically. v1 ordered on (mean, extreme) only,
		-- so a flat stretch resolved arbitrarily and could differ between runs.
		(array_agg(w.local_hour ORDER BY w.hour_mean DESC, w.wait_max DESC, w.bucket_start)
			FILTER (WHERE w.counts AND w.hour_mean IS NOT NULL AND w.op_in > 0))[1] AS peak_hour,
		(array_agg(w.local_hour ORDER BY w.hour_mean ASC, w.wait_min ASC, w.bucket_start)
			FILTER (WHERE w.counts AND w.hour_mean IS NOT NULL AND w.op_in > 0))[1] AS quietest_hour
	FROM weighted w
	GROUP BY w.ride_id
),
final AS (
	SELECT
		a.ride_id,
		$2::date AS local_date,
		round(a.op_minutes)::int AS operating_min,
		CASE
			WHEN a.has_sched
			THEN greatest(0, round(a.sched_min - a.op_minutes))::int
		END AS down_min,
		CASE WHEN a.has_sched THEN round(a.sched_min)::int END AS scheduled_min,
		round(a.wait_minutes)::int AS wait_minutes,
		round(a.wait_sum)::int AS wait_sum,
		a.wait_min,
		a.wait_max,
		nullif($3::jsonb -> a.ride_id::text, 'null'::jsonb) AS wait_dist,
		CASE WHEN a.has_peak THEN a.peak_hour END AS peak_hour,
		CASE WHEN a.has_peak THEN a.quietest_hour END AS quietest_hour
	FROM agg a
)
INSERT INTO ride_stats_daily (
	ride_id, local_date, operating_min, down_min, scheduled_min,
	wait_minutes, wait_sum, wait_min, wait_max,
	wait_dist, p25, p50, p90, peak_hour, quietest_hour
)
SELECT
	f.ride_id, f.local_date, f.operating_min, f.down_min, f.scheduled_min,
	f.wait_minutes, f.wait_sum, f.wait_min, f.wait_max,
	f.wait_dist,
	wait_dist_percentile(f.wait_dist, 0.25),
	wait_dist_percentile(f.wait_dist, 0.50),
	wait_dist_percentile(f.wait_dist, 0.90),
	f.peak_hour, f.quietest_hour
FROM final f
ON CONFLICT (ride_id, local_date) DO UPDATE SET
	operating_min = excluded.operating_min,
	down_min = excluded.down_min,
	scheduled_min = excluded.scheduled_min,
	wait_minutes = excluded.wait_minutes,
	wait_sum = excluded.wait_sum,
	wait_min = excluded.wait_min,
	wait_max = excluded.wait_max,
	wait_dist = excluded.wait_dist,
	p25 = excluded.p25,
	p50 = excluded.p50,
	p90 = excluded.p90,
	peak_hour = excluded.peak_hour,
	quietest_hour = excluded.quietest_hour
RETURNING ride_id;
