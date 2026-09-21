import { sql } from "../../db/index.js";
import { ChangeSource, rideStatusFromApi } from "../../db/schema/enums.js";
import type { JobSummary } from "../../lib/jobRuns.js";
import { pingDeadMan } from "../../lib/jobRuns.js";
import type { EntityLiveData } from "../../lib/themeparks.js";
import { themeparks } from "../../lib/themeparks.js";

/** How many parks are polled at once. The shared limiter still caps overall req/s. */
const PARK_CONCURRENCY = 4;
/** Parks outside their operating window are polled this often, to catch surprise openings. */
const OUT_OF_WINDOW_INTERVAL_MS = 55 * 60 * 1000;

type PollTarget = {
	id: string;
	external_id: string;
	timezone: string | null;
	in_window: boolean;
	last_polled: Date | null;
};

type RideState = {
	rideId: string;
	status: number | null;
	wait: number | null;
	single: number | null;
	apiUpdatedAt: Date | null;
};

type ShowTimeRow = {
	showId: string;
	type: string;
	startTime: Date;
	endTime: Date | null;
};

/**
 * Parks worth polling right now.
 *
 * `in_window` tests each OPERATING window individually rather than taking
 * min(opening)/max(closing) across the day: a park with one window ending 02:00 and
 * another starting 10:00 would otherwise look open all night.
 */
async function selectTargets(): Promise<PollTarget[]> {
	return sql<PollTarget[]>`
		select
			p.id,
			p.external_id,
			p.timezone,
			exists (
				select 1 from parks_schedule ps
				where ps.park_id = p.id
					and ps.type = 'OPERATING'
					and ps.opening_time is not null
					and ps.closing_time is not null
					and ps.local_date between
						(now() at time zone coalesce(p.timezone, 'UTC'))::date - 1 and
						(now() at time zone coalesce(p.timezone, 'UTC'))::date + 1
					and now() between ps.opening_time - interval '1 hour'
									and ps.closing_time + interval '1 hour'
			) as in_window,
			(
				select max(l.polled_at)
				from ride_live l
				join rides r on r.id = l.ride_id
				where r.park_id = p.id
			) as last_polled
		from parks p
		where p.is_active and p.external_id is not null
	`;
}

function shouldPoll(target: PollTarget, now: number): boolean {
	if (target.in_window) return true;
	if (!target.last_polled) return true;
	return now - target.last_polled.getTime() >= OUT_OF_WINDOW_INTERVAL_MS;
}

/** Pulls the standby/single-rider pair out of a live entity, tolerating nulls. */
function readQueue(entity: EntityLiveData): { wait: number | null; single: number | null } {
	const wait = entity.queue?.STANDBY?.waitTime;
	const single = entity.queue?.SINGLE_RIDER?.waitTime;
	return {
		wait: typeof wait === "number" ? wait : null,
		single: typeof single === "number" ? single : null,
	};
}

/**
 * Writes one park's live state in a single transaction.
 *
 * Order matters: `ride_changes` is written first, while `ride_live` still holds the
 * previous state to compare against. Only genuine transitions are recorded — v1 wrote
 * one row per active ride per poll (~1.77M/day), including NO_DATA placeholders and a
 * full raw_live_data blob nothing read.
 */
async function persistPark(
	parkId: string,
	states: RideState[],
	polledAt: Date,
	showTimes: ShowTimeRow[],
): Promise<{ changes: number }> {
	if (states.length === 0) return { changes: 0 };

	// Rows travel as one jsonb parameter expanded by jsonb_to_recordset.
	//
	// Two traps here. postgres.js's sql(rows) helper builds an INSERT column/VALUES
	// fragment, not a derived table, so it silently matches nothing when joined
	// against. And a pre-stringified array gets JSON-encoded a second time, arriving
	// as a jsonb *string* rather than an array. Plain objects through sql.json() is
	// the combination that works.
	const incoming = sql.json(
		states.map((s) => ({
			ride_id: s.rideId,
			status: s.status,
			wait: s.wait,
			single: s.single,
			api_updated_at: s.apiUpdatedAt?.toISOString() ?? null,
		})),
	);

	return sql.begin(async (tx) => {
		const changed = await tx<{ ride_id: string }[]>`
			with incoming as (
				select * from jsonb_to_recordset(${incoming}::jsonb) as t(
					ride_id uuid, status smallint, wait smallint,
					single smallint, api_updated_at timestamptz
				)
			)
			insert into ride_changes (ride_id, ts, status, wait, single, source)
			select
				i.ride_id,
				${polledAt}::timestamptz,
				i.status,
				i.wait,
				i.single,
				${ChangeSource.POLLER}::smallint
			from incoming i
			left join ride_live l on l.ride_id = i.ride_id
			where l.ride_id is null
				or l.status is distinct from i.status
				or l.wait_minutes is distinct from i.wait
				or l.single_rider_minutes is distinct from i.single
			on conflict (ride_id, ts) do nothing
			returning ride_id
		`;

		await tx`
			with incoming as (
				select * from jsonb_to_recordset(${incoming}::jsonb) as t(
					ride_id uuid, status smallint, wait smallint,
					single smallint, api_updated_at timestamptz
				)
			)
			insert into ride_live (
				ride_id, status, wait_minutes, single_rider_minutes, api_updated_at, polled_at
			)
			select
				i.ride_id, i.status, i.wait, i.single, i.api_updated_at,
				${polledAt}::timestamptz
			from incoming i
			on conflict (ride_id) do update set
				status = excluded.status,
				wait_minutes = excluded.wait_minutes,
				single_rider_minutes = excluded.single_rider_minutes,
				api_updated_at = excluded.api_updated_at,
				polled_at = excluded.polled_at
		`;

		if (showTimes.length > 0) {
			const rows = sql.json(
				showTimes.map((s) => ({
					show_id: s.showId,
					type: s.type,
					start_time: s.startTime.toISOString(),
					end_time: s.endTime?.toISOString() ?? null,
				})),
			);
			await tx`
				with incoming as (
					select * from jsonb_to_recordset(${rows}::jsonb) as t(
						show_id uuid, type text, start_time timestamptz, end_time timestamptz
					)
				)
				insert into show_times (show_id, local_date, type, start_time, end_time)
				select
					s.show_id,
					(s.start_time at time zone coalesce(p.timezone, 'UTC'))::date,
					s.type,
					s.start_time,
					s.end_time
				from incoming s
				join shows sh on sh.id = s.show_id
				join parks p on p.id = sh.park_id
				on conflict (show_id, local_date, start_time) do update set
					type = excluded.type,
					end_time = excluded.end_time,
					updated_at = now()
			`;
		}

		// Tells the api's in-process cache which park to evict.
		await tx`select pg_notify('airtimely_poll', ${parkId})`;

		return { changes: changed.length };
	});
}

async function pollPark(target: PollTarget): Promise<{ changes: number; rides: number }> {
	const response = await themeparks.live(target.external_id);
	const polledAt = new Date();
	const entities = response.liveData ?? [];
	if (entities.length === 0) return { changes: 0, rides: 0 };

	const externalIds = entities.map((e) => e.id);
	const [rideRows, showRows] = await Promise.all([
		sql<{ id: string; external_id: string }[]>`
			select id, external_id from rides
			where park_id = ${target.id} and external_id = any(${externalIds})
		`,
		sql<{ id: string; external_id: string }[]>`
			select id, external_id from shows
			where park_id = ${target.id} and external_id = any(${externalIds})
		`,
	]);

	const rideByExternal = new Map(rideRows.map((r) => [r.external_id, r.id]));
	const showByExternal = new Map(showRows.map((r) => [r.external_id, r.id]));

	const states: RideState[] = [];
	const showTimes: ShowTimeRow[] = [];

	for (const entity of entities) {
		const rideId = rideByExternal.get(entity.id);
		if (rideId) {
			const { wait, single } = readQueue(entity);
			states.push({
				rideId,
				status: rideStatusFromApi(entity.status),
				wait,
				single,
				apiUpdatedAt: entity.lastUpdated ? new Date(entity.lastUpdated) : null,
			});
			continue;
		}

		const showId = showByExternal.get(entity.id);
		if (showId && entity.showtimes) {
			for (const slot of entity.showtimes) {
				if (!slot.startTime) continue;
				showTimes.push({
					showId,
					type: slot.type,
					startTime: new Date(slot.startTime),
					endTime: slot.endTime ? new Date(slot.endTime) : null,
				});
			}
		}
	}

	const { changes } = await persistPark(target.id, states, polledAt, showTimes);
	return { changes, rides: states.length };
}

/** Runs `worker` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(
	items: T[],
	limit: number,
	worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
	const results: PromiseSettledResult<R>[] = new Array(items.length);
	let cursor = 0;

	async function drain(): Promise<void> {
		for (;;) {
			const index = cursor++;
			if (index >= items.length) return;
			try {
				results[index] = { status: "fulfilled", value: await worker(items[index]!) };
			} catch (reason) {
				results[index] = { status: "rejected", reason };
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, drain));
	return results;
}

export async function livePoll(): Promise<JobSummary> {
	const targets = await selectTargets();
	const now = Date.now();
	const due = targets.filter((t) => shouldPoll(t, now));

	const results = await mapLimit(due, PARK_CONCURRENCY, pollPark);

	let changes = 0;
	let ridesSeen = 0;
	const failures: string[] = [];

	results.forEach((result, index) => {
		if (result.status === "fulfilled") {
			changes += result.value.changes;
			ridesSeen += result.value.rides;
		} else {
			const reason: unknown = result.reason;
			failures.push(
				`${due[index]!.external_id}: ${reason instanceof Error ? reason.message : String(reason)}`,
			);
		}
	});

	// Only ping when every park succeeded: a partial poll is a degraded poll, and a
	// dead-man that fires anyway would report health the pipeline does not have.
	if (failures.length === 0) await pingDeadMan();

	return {
		parksConsidered: targets.length,
		parksPolled: due.length,
		parksSkipped: targets.length - due.length,
		ridesSeen,
		changesRecorded: changes,
		failureCount: failures.length,
		failures: failures.slice(0, 20),
	};
}
