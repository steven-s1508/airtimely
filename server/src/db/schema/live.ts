import { index, pgTable, primaryKey, smallint, timestamp, uuid } from "drizzle-orm/pg-core";

import { rides } from "./entities.js";

/**
 * Current state of every ride, upserted every poll. The park screen reads only this.
 * One row per ride — no history, no growth.
 */
export const rideLive = pgTable("ride_live", {
	rideId: uuid("ride_id")
		.primaryKey()
		.references(() => rides.id, { onDelete: "cascade" }),
	status: smallint("status"),
	waitMinutes: smallint("wait_minutes"),
	singleRiderMinutes: smallint("single_rider_minutes"),
	apiUpdatedAt: timestamp("api_updated_at", { withTimezone: true }),
	polledAt: timestamp("polled_at", { withTimezone: true }).notNull(),
});

/**
 * Transient change log: one row per state *change*, not one per poll per ride.
 * v1 wrote ~6,137 rows every 5 minutes (~1.77M/day) including NO_DATA placeholders
 * and a full `raw_live_data` blob nothing read; this records roughly 32 changes per
 * attraction per day at a busy park.
 *
 * `ts` is a true UTC instant. v1's `recorded_at_local` held park-local wall time in a
 * `timestamptz` column as if it were UTC, which only worked while every session ran
 * in UTC; park-local time is derived from the park timezone instead.
 *
 * Rows are deleted once the park-day is finalised (~2 days). Created as a
 * RANGE-partitioned table in a hand-written migration — Drizzle cannot express
 * declarative partitioning, so the generated CREATE TABLE is post-processed.
 */
export const rideChanges = pgTable(
	"ride_changes",
	{
		rideId: uuid("ride_id").notNull(),
		ts: timestamp("ts", { withTimezone: true }).notNull(),
		status: smallint("status"),
		wait: smallint("wait"),
		single: smallint("single"),
		source: smallint("source").notNull(),
	},
	(t) => [
		// `ts` must be in the key: Postgres requires the partition column in the PK.
		primaryKey({ columns: [t.rideId, t.ts] }),
		index("idx_ride_changes_ts").on(t.ts),
	],
);
