-- Hand-written: weighted percentile over a sparse wait_dist map.
--
-- wait_dist maps a displayed wait value to the number of minutes it was displayed,
-- e.g. {"0":20,"5":85,"20":138,"30":248}. Percentiles for any period are computed by
-- summing the maps of the days involved, which is why the map is written at
-- finalisation: percentiles cannot be averaged, and the raw change log is deleted
-- once the day is final.
--
-- Discrete lower-weighted percentile: the smallest value whose cumulative minutes
-- reach p of the total. Deterministic, and it never invents a wait that was never
-- displayed the way linear interpolation would.
CREATE OR REPLACE FUNCTION wait_dist_percentile(p_dist jsonb, p numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
	WITH entries AS (
		SELECT key::numeric AS wait_value, value::numeric AS minutes
		FROM jsonb_each_text(p_dist)
		WHERE value::numeric > 0
	),
	ranked AS (
		SELECT
			wait_value,
			sum(minutes) OVER (ORDER BY wait_value) AS cumulative,
			sum(minutes) OVER () AS total
		FROM entries
	)
	SELECT min(wait_value)
	FROM ranked
	WHERE total > 0 AND cumulative >= p * total;
$$;
