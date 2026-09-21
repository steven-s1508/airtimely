import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "../../db/index.js";

/** Sparse map of displayed wait value to minutes it was displayed, per ride. */
export type WaitDistByRide = Record<string, Record<string, number>>;

// Read once. Lives beside the compiled output, so the build copies it (see package.json).
const ROLLUP_SQL = readFileSync(path.join(import.meta.dirname, "rollup.sql"), "utf8");

/**
 * Rebuilds `ride_stats_daily` for one park-day from `ride_stats_hourly`.
 *
 * Idempotent: it upserts every ride that has hourly buckets for the day, so a re-run
 * after a correction produces the same result.
 */
export async function rollupParkDay(
	parkId: string,
	localDate: string,
	waitDist: WaitDistByRide = {},
): Promise<number> {
	// The map goes as a plain object, not a JSON string: postgres.js infers jsonb from
	// the `::jsonb` cast and encodes the value itself, so a pre-stringified map arrives
	// as a jsonb *string* and every key lookup silently returns null.
	const rows = await sql.unsafe(ROLLUP_SQL, [parkId, localDate, waitDist as never]);
	return rows.length;
}
