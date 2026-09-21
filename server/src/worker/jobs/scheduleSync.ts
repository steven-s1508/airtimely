import { sql } from "../../db/index.js";
import type { JobSummary } from "../../lib/jobRuns.js";
import type { JsonValue } from "../../lib/jobRuns.js";
import type { ScheduleEntry } from "../../lib/themeparks.js";
import { themeparks } from "../../lib/themeparks.js";

/** Schedule kinds the schema accepts. Anything else is reported, not inserted. */
const KNOWN_TYPES = new Set(["OPERATING", "INFO", "TICKETED_EVENT", "EXTRA_HOURS"]);

/**
 * API schedule kinds that mean the same thing as one of ours.
 *
 * `PARK_OPEN` carries real opening and closing times and is simply how some parks
 * express operating hours: Universal Studios Singapore uses it for *every* entry and
 * has no OPERATING rows at all.
 *
 * v1 had no such mapping and a CHECK constraint that rejected the value, so the bulk
 * insert failed for the whole park and it ended up with zero schedule rows — which in
 * turn left all 18 of its rides with NULL uptime on every single day. Mapping here
 * keeps the load-bearing `type = 'OPERATING'` test in the rollup a single condition.
 */
const TYPE_ALIASES: Record<string, string> = {
	PARK_OPEN: "OPERATING",
};

type Row = {
	park_id: string;
	local_date: string;
	type: string;
	opening_time: string | null;
	closing_time: string | null;
	description: string | null;
	purchases: JsonValue;
};

/**
 * Replaces one park's schedule for exactly the dates the API returned.
 *
 * Delete-then-insert per returned date, inside one transaction, matching v1: a date
 * the API stops mentioning keeps whatever it had, because a schedule vanishing from a
 * response is far more often an upstream gap than a park cancelling a day.
 */
async function replaceSchedule(parkId: string, rows: Row[]): Promise<number> {
	if (rows.length === 0) return 0;
	const dates = [...new Set(rows.map((r) => r.local_date))];

	return sql.begin(async (tx) => {
		await tx`
			delete from parks_schedule
			where park_id = ${parkId}::uuid and local_date = any(${dates}::date[])
		`;

		const payload = sql.json(
			rows.map((r) => ({
				park_id: r.park_id,
				local_date: r.local_date,
				type: r.type,
				opening_time: r.opening_time,
				closing_time: r.closing_time,
				description: r.description,
				purchases: r.purchases ?? null,
			})),
		);

		await tx`
			insert into parks_schedule (
				park_id, local_date, type, opening_time, closing_time, description, purchases
			)
			select
				s.park_id, s.local_date, s.type::schedule_type,
				s.opening_time, s.closing_time, s.description, s.purchases
			from jsonb_to_recordset(${payload}::jsonb) as s(
				park_id uuid, local_date date, type text,
				opening_time timestamptz, closing_time timestamptz,
				description text, purchases jsonb
			)
			on conflict do nothing
		`;

		return rows.length;
	});
}

/**
 * Syncs park opening hours.
 *
 * Times are stored as `timestamptz`. v1 kept them as `text` and cast at every read
 * site, which is what let the daily aggregation compare park-local hours against
 * offset-shifted opening times.
 */
export async function scheduleSync(): Promise<JobSummary> {
	const parks = await sql<{ id: string; external_id: string; name: string }[]>`
		select id, external_id, name from parks
		where is_active and external_id is not null
		order by name
	`;

	let parksProcessed = 0;
	let parksWithoutSchedule = 0;
	let entriesWritten = 0;
	const unknownTypes = new Map<string, number>();
	const normalisedTypes = new Map<string, number>();
	const failures: string[] = [];

	for (const park of parks) {
		try {
			const response = await themeparks.schedule(park.external_id);
			const entries: ScheduleEntry[] = response.schedule ?? [];

			if (entries.length === 0) {
				// A valid empty response is not a failure.
				parksWithoutSchedule++;
				parksProcessed++;
				continue;
			}

			const rows: Row[] = [];
			for (const entry of entries) {
				const aliased = TYPE_ALIASES[entry.type];
				if (aliased) {
					normalisedTypes.set(entry.type, (normalisedTypes.get(entry.type) ?? 0) + 1);
				}
				const type = aliased ?? entry.type;

				if (!KNOWN_TYPES.has(type)) {
					// Skip the row, keep the park. A new schedule kind upstream must not
					// cost this park its whole schedule.
					unknownTypes.set(entry.type, (unknownTypes.get(entry.type) ?? 0) + 1);
					continue;
				}
				rows.push({
					park_id: park.id,
					local_date: entry.date,
					type,
					opening_time: entry.openingTime ?? null,
					closing_time: entry.closingTime ?? null,
					description: entry.description ?? null,
					purchases: (entry.purchases ?? null) as JsonValue,
				});
			}

			entriesWritten += await replaceSchedule(park.id, rows);
			parksProcessed++;
		} catch (error) {
			failures.push(`${park.name}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	return {
		parksProcessed,
		parksWithoutSchedule,
		entriesWritten,
		unknownTypes: Object.fromEntries(unknownTypes),
		normalisedTypes: Object.fromEntries(normalisedTypes),
		failureCount: failures.length,
		failures: failures.slice(0, 20),
	};
}
