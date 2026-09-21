import { sql } from "../../db/index.js";
import { ChangeSource, IngestStatus } from "../../db/schema/enums.js";
import type { JobSummary } from "../../lib/jobRuns.js";
import type { ChangeState } from "../../lib/stats/bucketize.js";
import { bucketize } from "../../lib/stats/bucketize.js";
import type { WaitDistByRide } from "../../lib/stats/rollup.js";
import { rollupParkDay } from "../../lib/stats/rollup.js";
import { HistoryBudgetExhausted, themeparks } from "../../lib/themeparks.js";

/** Days back to finalise on a normal night. */
const LOOKBACK_DAYS = 3;
/** The history API's window with the free key. Past this a park-day is unrecoverable. */
const RETRY_WINDOW_DAYS = 30;
/** Leave some history budget for the validate job and ad-hoc work. */
const BUDGET_RESERVE = 40;

type Candidate = {
	park_id: string;
	external_id: string;
	timezone: string;
	local_date: string;
	attempts: number;
};

/**
 * Park-days that still need finalising, oldest first.
 *
 * Oldest-first matters: a day only has 30 days before it falls out of the history
 * window and becomes unrecoverable, so a backlog must drain from the far end even
 * though the recent days are the ones users look at.
 */
async function selectCandidates(): Promise<Candidate[]> {
	return sql<Candidate[]>`
		with recent as (
			select
				p.id as park_id,
				p.external_id,
				coalesce(p.timezone, 'UTC') as timezone,
				((now() at time zone coalesce(p.timezone, 'UTC'))::date - offs) as local_date
			from parks p
			cross join generate_series(1, ${LOOKBACK_DAYS}::int) as offs
			where p.is_active and p.external_id is not null
		),
		retries as (
			select
				p.id as park_id,
				p.external_id,
				coalesce(p.timezone, 'UTC') as timezone,
				i.local_date
			from park_day_ingest i
			join parks p on p.id = i.park_id
			where i.finalised_at is null
				and p.is_active and p.external_id is not null
				and i.local_date >= (now() at time zone 'UTC')::date - ${RETRY_WINDOW_DAYS}::int
		),
		merged as (
			select * from recent
			union
			select * from retries
		)
		select
			m.park_id,
			m.external_id,
			m.timezone,
			m.local_date::text as local_date,
			coalesce(i.attempts, 0) as attempts
		from merged m
		left join park_day_ingest i
			on i.park_id = m.park_id and i.local_date = m.local_date
		where i.finalised_at is null
			-- Only days that are fully over in the park's own timezone.
			and m.local_date < (now() at time zone m.timezone)::date
		order by m.local_date asc, m.park_id
	`;
}

/**
 * States for rides the history API did not return, taken from our own change log.
 *
 * Includes the last change before the day began, which is the state the ride was in
 * at local midnight — without it the first hours of the day look uncovered.
 */
async function fallbackStates(
	parkId: string,
	localDate: string,
	timezone: string,
	excludeRideIds: string[],
): Promise<Map<string, ChangeState[]>> {
	const rows = await sql<
		{ ride_id: string; ts: Date; status: number | null; wait: number | null; single: number | null }[]
	>`
		with bounds as (
			select
				(${localDate}::date)::timestamp at time zone ${timezone} as day_start,
				(${localDate}::date + 1)::timestamp at time zone ${timezone} as day_end
		),
		park_rides as (
			select id from rides
			where park_id = ${parkId}::uuid
				and not (id = any(${excludeRideIds}::uuid[]))
		),
		during as (
			select c.ride_id, c.ts, c.status, c.wait, c.single
			from ride_changes c, bounds b
			where c.ride_id in (select id from park_rides)
				and c.ts >= b.day_start and c.ts < b.day_end
		),
		opening as (
			select distinct on (c.ride_id) c.ride_id, c.ts, c.status, c.wait, c.single
			from ride_changes c, bounds b
			where c.ride_id in (select id from park_rides) and c.ts < b.day_start
			order by c.ride_id, c.ts desc
		)
		select * from during
		union all
		select * from opening
		order by ride_id, ts
	`;

	const byRide = new Map<string, ChangeState[]>();
	// Codes are stored; bucketize compares status names, so map back.
	const names: Record<number, string> = {
		0: "CLOSED",
		1: "OPERATING",
		2: "DOWN",
		3: "REFURBISHMENT",
	};
	for (const row of rows) {
		const list = byRide.get(row.ride_id) ?? [];
		list.push({
			t: row.ts.getTime(),
			status: row.status === null ? null : (names[row.status] ?? null),
			wait: row.wait,
			single: row.single,
		});
		byRide.set(row.ride_id, list);
	}
	return byRide;
}

/** One ride_stats_hourly row, shaped for jsonb_to_recordset. */
type BucketRow = {
	ride_id: string;
	bucket_start: string;
	local_date: string;
	local_hour: number;
	operating_min: number;
	down_min: number;
	closed_min: number;
	wait_minutes: number;
	wait_sum: number;
	wait_min: number | null;
	wait_max: number | null;
	single_mean: number | null;
};

type ParkDayResult = {
	ridesWritten: number;
	bucketsWritten: number;
	fromHistory: number;
	fromOwnChanges: number;
	unknownAttractions: string[];
	source: number;
};

async function finaliseParkDay(candidate: Candidate): Promise<ParkDayResult> {
	const { park_id: parkId, external_id: externalId, timezone, local_date: localDate } = candidate;

	const history = await themeparks.history(externalId, localDate);
	const entities = history?.entities ?? [];

	const rides = await sql<{ id: string; external_id: string | null }[]>`
		select id, external_id from rides where park_id = ${parkId}::uuid
	`;
	const rideByExternal = new Map(
		rides.filter((r) => r.external_id).map((r) => [r.external_id!, r.id]),
	);

	const statesByRide = new Map<string, ChangeState[]>();
	const unknownAttractions: string[] = [];

	for (const entity of entities) {
		const rideId = rideByExternal.get(entity.id);
		if (!rideId) {
			// A to-do for the entity sync, not a failure.
			if (entity.entityType === "ATTRACTION") unknownAttractions.push(entity.name);
			continue;
		}
		const states: ChangeState[] = [];
		if (entity.opening) {
			states.push({
				t: Date.parse(entity.opening.time),
				status: entity.opening.status,
				wait: entity.opening.queue?.STANDBY?.waitTime,
				single: entity.opening.queue?.SINGLE_RIDER?.waitTime,
			});
		}
		for (const row of entity.history ?? []) {
			states.push({
				t: Date.parse(row.time),
				status: row.status,
				wait: row.queue?.STANDBY?.waitTime,
				single: row.queue?.SINGLE_RIDER?.waitTime,
			});
		}
		if (states.length > 0) statesByRide.set(rideId, states);
	}

	const fromHistory = statesByRide.size;

	// Rides the API omitted fall back to our own poller data.
	const fallback = await fallbackStates(parkId, localDate, timezone, [...statesByRide.keys()]);
	for (const [rideId, states] of fallback) {
		if (states.length > 0) statesByRide.set(rideId, states);
	}
	const fromOwnChanges = statesByRide.size - fromHistory;

	const waitDist: WaitDistByRide = {};
	const bucketRows: BucketRow[] = [];

	for (const [rideId, states] of statesByRide) {
		const { buckets, waitDist: dist } = bucketize(states, localDate, timezone);
		if (Object.keys(dist).length > 0) waitDist[rideId] = dist;
		for (const b of buckets) {
			bucketRows.push({
				ride_id: rideId,
				bucket_start: b.bucketStart.toISOString(),
				local_date: b.localDate,
				local_hour: b.localHour,
				operating_min: b.operatingMin,
				down_min: b.downMin,
				closed_min: b.closedMin,
				wait_minutes: b.waitMinutes,
				wait_sum: b.waitSum,
				wait_min: b.waitMin,
				wait_max: b.waitMax,
				single_mean: b.singleMean,
			});
		}
	}

	await sql.begin(async (tx) => {
		// Replace rather than upsert: a re-run that produces fewer buckets must not
		// leave stale ones behind. Scoped to the rides we have states for, so a ride the
		// history omitted keeps what it had — for the days imported from v1, that is
		// the only record there is, and nothing must never replace something.
		await tx`
			delete from ride_stats_hourly h
			where h.ride_id = any(${[...statesByRide.keys()]}::uuid[])
				and h.local_date = ${localDate}::date
		`;

		if (bucketRows.length > 0) {
			await tx`
				insert into ride_stats_hourly (
					ride_id, bucket_start, local_date, local_hour,
					operating_min, down_min, closed_min,
					wait_minutes, wait_sum, wait_min, wait_max, single_mean
				)
				select
					b.ride_id, b.bucket_start, b.local_date, b.local_hour,
					b.operating_min, b.down_min, b.closed_min,
					b.wait_minutes, b.wait_sum, b.wait_min, b.wait_max, b.single_mean
				from jsonb_to_recordset(${sql.json(bucketRows)}::jsonb) as b(
					ride_id uuid, bucket_start timestamptz, local_date date, local_hour smallint,
					operating_min smallint, down_min smallint, closed_min smallint,
					wait_minutes smallint, wait_sum int, wait_min smallint, wait_max smallint,
					single_mean numeric
				)
			`;
		}
	});

	const ridesWritten = await rollupParkDay(parkId, localDate, waitDist);

	const source = history ? ChangeSource.HISTORY_API : ChangeSource.POLLER;

	await sql.begin(async (tx) => {
		await tx`
			insert into park_day_ingest (park_id, local_date, source, status, attempts, finalised_at)
			values (
				${parkId}::uuid, ${localDate}::date, ${source}::smallint,
				${history ? IngestStatus.FINALISED : IngestStatus.NO_HISTORY}::smallint,
				${candidate.attempts + 1}::smallint, now()
			)
			on conflict (park_id, local_date) do update set
				source = excluded.source,
				status = excluded.status,
				attempts = excluded.attempts,
				last_error = null,
				finalised_at = excluded.finalised_at
		`;

		// Raw changes go only after the day is recorded as final.
		await tx`
			delete from ride_changes c
			using rides r
			where r.id = c.ride_id
				and r.park_id = ${parkId}::uuid
				and c.ts >= (${localDate}::date)::timestamp at time zone ${timezone}
				and c.ts < (${localDate}::date + 1)::timestamp at time zone ${timezone}
		`;
	});

	return {
		ridesWritten,
		bucketsWritten: bucketRows.length,
		fromHistory,
		fromOwnChanges,
		unknownAttractions,
		source,
	};
}

async function recordFailure(candidate: Candidate, error: unknown): Promise<void> {
	const message = error instanceof Error ? error.message : String(error);
	await sql`
		insert into park_day_ingest (park_id, local_date, status, attempts, last_error)
		values (
			${candidate.park_id}::uuid, ${candidate.local_date}::date,
			${IngestStatus.FAILED}::smallint, ${candidate.attempts + 1}::smallint, ${message}
		)
		on conflict (park_id, local_date) do update set
			status = ${IngestStatus.FAILED}::smallint,
			attempts = park_day_ingest.attempts + 1,
			last_error = excluded.last_error
	`;
}

export async function finaliseDay(): Promise<JobSummary> {
	const candidates = await selectCandidates();
	const budget = Math.max(0, themeparks.historyRemaining() - BUDGET_RESERVE);

	let processed = 0;
	let ridesWritten = 0;
	let bucketsWritten = 0;
	let fromOwnChanges = 0;
	let noHistory = 0;
	let budgetStopped = false;
	const unknownAttractions = new Set<string>();
	const failures: string[] = [];

	for (const candidate of candidates) {
		if (processed >= budget) {
			budgetStopped = true;
			break;
		}
		try {
			const result = await finaliseParkDay(candidate);
			processed++;
			ridesWritten += result.ridesWritten;
			bucketsWritten += result.bucketsWritten;
			fromOwnChanges += result.fromOwnChanges;
			if (result.source === ChangeSource.POLLER) noHistory++;
			for (const name of result.unknownAttractions) unknownAttractions.add(name);
		} catch (error) {
			if (error instanceof HistoryBudgetExhausted) {
				budgetStopped = true;
				break;
			}
			await recordFailure(candidate, error);
			failures.push(
				`${candidate.external_id} ${candidate.local_date}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	return {
		candidates: candidates.length,
		processed,
		ridesWritten,
		bucketsWritten,
		ridesFromOwnChanges: fromOwnChanges,
		parkDaysWithoutHistory: noHistory,
		budgetStopped,
		historyRemaining: themeparks.historyRemaining(),
		unknownAttractions: [...unknownAttractions].slice(0, 25),
		failureCount: failures.length,
		failures: failures.slice(0, 20),
	};
}
