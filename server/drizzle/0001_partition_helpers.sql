-- Hand-written: partition management for ride_changes.
--
-- ride_changes is RANGE-partitioned by ts (UTC day). Retention is ~2 days: rows are
-- dropped once the park-day they belong to is finalised, and dropping a partition
-- beats a DELETE over millions of rows.
--
-- There is deliberately NO default partition. An insert for a day with no partition
-- must fail loudly rather than silently pile into a catch-all that never gets
-- dropped -- the maintenance job creating tomorrow's partition is then self-checking.

CREATE OR REPLACE FUNCTION create_ride_changes_partition(p_day date)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
	v_name text := format('ride_changes_%s', to_char(p_day, 'YYYYMMDD'));
BEGIN
	IF to_regclass(format('public.%I', v_name)) IS NOT NULL THEN
		RETURN v_name || ' (exists)';
	END IF;

	EXECUTE format(
		'CREATE TABLE %I PARTITION OF ride_changes FOR VALUES FROM (%L) TO (%L)',
		v_name,
		p_day::timestamptz,
		(p_day + 1)::timestamptz
	);

	RETURN v_name || ' (created)';
END;
$$;
--> statement-breakpoint

-- Drops every partition whose whole range is older than p_before. Returns the names
-- dropped so the maintenance job can record them in job_runs.
CREATE OR REPLACE FUNCTION drop_ride_changes_partitions_before(p_before date)
RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
	v_child record;
	v_day date;
BEGIN
	FOR v_child IN
		SELECT c.relname
		FROM pg_inherits i
		JOIN pg_class c ON c.oid = i.inhrelid
		JOIN pg_class p ON p.oid = i.inhparent
		WHERE p.relname = 'ride_changes'
	LOOP
		-- Name carries the day: ride_changes_YYYYMMDD
		BEGIN
			v_day := to_date(right(v_child.relname, 8), 'YYYYMMDD');
		EXCEPTION WHEN others THEN
			CONTINUE;  -- not one of ours; leave it alone
		END;

		IF v_day < p_before THEN
			EXECUTE format('DROP TABLE %I', v_child.relname);
			RETURN NEXT v_child.relname;
		END IF;
	END LOOP;
END;
$$;
--> statement-breakpoint

-- Seed today's and tomorrow's partitions so the poller can write immediately.
SELECT create_ride_changes_partition((now() AT TIME ZONE 'UTC')::date);
--> statement-breakpoint
SELECT create_ride_changes_partition(((now() AT TIME ZONE 'UTC')::date) + 1);
