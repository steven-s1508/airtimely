import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Entity kinds as ThemeParks.wiki reports them. Only values this codebase writes
 * ever reach the column, so widening the API's vocabulary cannot break an insert.
 */
export const entityTypeEnum = pgEnum("entity_type", [
	"DESTINATION",
	"PARK",
	"ATTRACTION",
	"SHOW",
	"RESTAURANT",
	"HOTEL",
]);

/**
 * Schedule window kinds. Mirrors the CHECK constraint v1 carried on
 * `parks_schedule.type`. Unlike `entity_type` these come straight from the API, so
 * the schedule sync must skip an unrecognised value and report it in `job_runs`
 * rather than letting the insert throw and lose the whole park.
 */
export const scheduleTypeEnum = pgEnum("schedule_type", [
	"OPERATING",
	"INFO",
	"TICKETED_EVENT",
	"EXTRA_HOURS",
]);

/**
 * Ride status as a compact code. `ride_changes` is the highest-volume table in the
 * system and every poll compares its status against `ride_live`, so both store the
 * code rather than text.
 *
 * Only `OPERATING` time counts toward wait statistics: rides routinely keep
 * displaying their last wait while DOWN or CLOSED.
 */
export const RideStatus = {
	CLOSED: 0,
	OPERATING: 1,
	DOWN: 2,
	REFURBISHMENT: 3,
} as const;

export type RideStatusCode = (typeof RideStatus)[keyof typeof RideStatus];

export const RIDE_STATUS_BY_CODE = Object.fromEntries(
	Object.entries(RideStatus).map(([name, code]) => [code, name]),
) as Record<RideStatusCode, keyof typeof RideStatus>;

/** Maps an API status string onto its code; unknown values are not recorded. */
export function rideStatusFromApi(status: string | null | undefined): RideStatusCode | null {
	if (!status) return null;
	const code = RideStatus[status as keyof typeof RideStatus];
	return code ?? null;
}

/** Where a `ride_changes` row came from. History wins over the poller on conflict. */
export const ChangeSource = {
	POLLER: 0,
	HISTORY_API: 1,
} as const;

export type ChangeSourceCode = (typeof ChangeSource)[keyof typeof ChangeSource];

/** Lifecycle of one park-day in `park_day_ingest`. */
export const IngestStatus = {
	PENDING: 0,
	FINALISED: 1,
	FAILED: 2,
	/** Park-day the history API has no record of; own `ride_changes` were used. */
	NO_HISTORY: 3,
} as const;

export type IngestStatusCode = (typeof IngestStatus)[keyof typeof IngestStatus];
