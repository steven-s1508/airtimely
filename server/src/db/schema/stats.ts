import {
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	smallint,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { rides } from "./entities.js";

/**
 * Permanent per-ride, per-park-local-hour statistics.
 *
 * Keyed on `bucket_start` (an instant), not `(local_date, local_hour)`. On the autumn
 * DST transition the repeated local hour therefore produces two rows sharing a
 * `local_hour`, where v1's `unique (ride_id, date, hour)` silently merged them.
 * **Daily rollups must group by `bucket_start`, never by `local_hour`.**
 *
 * `wait_sum` and `wait_minutes` are stored rather than a precomputed average so the
 * mean stays additive across any span: mean = wait_sum / wait_minutes. Both count
 * only time the ride was OPERATING.
 */
export const rideStatsHourly = pgTable(
	"ride_stats_hourly",
	{
		rideId: uuid("ride_id")
			.notNull()
			.references(() => rides.id, { onDelete: "cascade" }),
		/** The instant the park-local hour begins. */
		bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
		localDate: date("local_date", { mode: "string" }).notNull(),
		localHour: smallint("local_hour").notNull(),

		operatingMin: smallint("operating_min"),
		downMin: smallint("down_min"),
		closedMin: smallint("closed_min"),
		/** Minutes of this hour inside an official OPERATING window; NULL if unknown. */
		scheduledMin: smallint("scheduled_min"),

		/** Minutes a standby wait was displayed while OPERATING. */
		waitMinutes: smallint("wait_minutes"),
		/** Sum of (wait x minutes). Integer, not smallint: 60 min at a long wait overflows. */
		waitSum: integer("wait_sum"),
		waitMin: smallint("wait_min"),
		waitMax: smallint("wait_max"),
		singleMean: numeric("single_mean", { precision: 5, scale: 2 }),
	},
	(t) => [
		primaryKey({ columns: [t.rideId, t.bucketStart] }),
		index("idx_ride_stats_hourly_ride_date").on(t.rideId, t.localDate),
		index("idx_ride_stats_hourly_date").on(t.localDate),
	],
);

/**
 * Permanent per-ride, per-park-local-day statistics.
 *
 * Every wait statistic is NULL when nothing operated, never 0 — zeros previously
 * dragged one ride's chart average to 2.4 min against a true ~13. Uptime and
 * downtime are NULL when the day has no schedule: unknown, never guessed.
 */
export const rideStatsDaily = pgTable(
	"ride_stats_daily",
	{
		rideId: uuid("ride_id")
			.notNull()
			.references(() => rides.id, { onDelete: "cascade" }),
		localDate: date("local_date", { mode: "string" }).notNull(),

		operatingMin: integer("operating_min"),
		downMin: integer("down_min"),
		/** Total minutes inside official OPERATING windows; NULL when no schedule. */
		scheduledMin: integer("scheduled_min"),

		waitMinutes: integer("wait_minutes"),
		waitSum: integer("wait_sum"),
		waitMin: smallint("wait_min"),
		waitMax: smallint("wait_max"),

		/**
		 * Sparse map of wait value to minutes that value was displayed, e.g.
		 * `{"0":20,"5":85,"20":138,"30":248}`. Not time-bucketed, not rounded.
		 *
		 * Written at finalisation because percentiles cannot be averaged and the raw
		 * change log is deleted afterwards. Percentiles for any longer period are
		 * computed by summing the maps of the days involved.
		 */
		waitDist: jsonb("wait_dist").$type<Record<string, number>>(),

		/** Single-day percentiles, cached from `wait_dist`. */
		p25: numeric("p25", { precision: 5, scale: 2 }),
		p50: numeric("p50", { precision: 5, scale: 2 }),
		p90: numeric("p90", { precision: 5, scale: 2 }),

		/** NULL on a flat day, where every counted hour has the same mean. */
		peakHour: smallint("peak_hour"),
		quietestHour: smallint("quietest_hour"),
	},
	(t) => [
		primaryKey({ columns: [t.rideId, t.localDate] }),
		index("idx_ride_stats_daily_date").on(t.localDate.desc()),
	],
);
