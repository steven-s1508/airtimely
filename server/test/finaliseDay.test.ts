import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { sql } from "../src/db/index.js";
import { ChangeSource, IngestStatus, RideStatus } from "../src/db/schema/enums.js";
import type { HistoryResponse } from "../src/lib/themeparks.js";
import { themeparks } from "../src/lib/themeparks.js";
import { finaliseDay } from "../src/worker/jobs/finaliseDay.js";

const PARK = "aaaaaaaa-0000-4000-8000-000000000001";
const RIDE_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const RIDE_B = "aaaaaaaa-0000-4000-8000-00000000000b";

/** Yesterday in UTC — the park runs on UTC so its local day is definitely over. */
let day: string;

function stubHistory(response: HistoryResponse | null): void {
	(themeparks as { history: (id: string, date: string) => Promise<HistoryResponse | null> }).history =
		() => Promise.resolve(response);
}

/** A full day: OPERATING 10:00-12:00 at 20 then 40, CLOSED after. */
function historyForRideA(): HistoryResponse {
	return {
		id: "ext-park",
		name: "Test Park",
		entities: [
			{
				id: "ext-a",
				name: "Ride A",
				entityType: "ATTRACTION",
				opening: { time: `${day}T00:00:00Z`, status: "CLOSED", queue: null },
				history: [
					{ time: `${day}T10:00:00Z`, status: "OPERATING", queue: { STANDBY: { waitTime: 20 } } },
					{ time: `${day}T11:00:00Z`, status: "OPERATING", queue: { STANDBY: { waitTime: 40 } } },
					{ time: `${day}T12:00:00Z`, status: "CLOSED", queue: null },
				],
			},
		],
	};
}

async function seedBase(): Promise<void> {
	await sql`delete from park_day_ingest`;
	await sql`delete from ride_stats_daily`;
	await sql`delete from ride_stats_hourly`;
	await sql`delete from ride_changes`;
	await sql`delete from ride_live`;
	await sql`delete from parks_schedule`;
	await sql`delete from rides`;
	await sql`delete from parks`;
	await sql`delete from destinations`;

	await sql`
		insert into parks (id, name, slug, timezone, external_id)
		values (${PARK}, 'Test Park', 'test-park', 'UTC', 'ext-park')
	`;
	await sql`
		insert into rides (id, park_id, name, external_id) values
			(${RIDE_A}, ${PARK}, 'Ride A', 'ext-a'),
			(${RIDE_B}, ${PARK}, 'Ride B', 'ext-b')
	`;
	// Scheduled 10:00-12:00, so uptime is measurable.
	await sql`
		insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
		values (${PARK}, ${day}::date, 'OPERATING',
				(${day} || 'T10:00:00Z')::timestamptz, (${day} || 'T12:00:00Z')::timestamptz)
	`;
}

describe("finalise day", () => {
	before(async () => {
		const [row] = await sql<{ d: string }[]>`
			select ((now() at time zone 'UTC')::date - 1)::text as d
		`;
		day = row!.d;
		// ride_changes is partitioned; yesterday's partition is needed for the fallback case.
		await sql`select create_ride_changes_partition(${day}::date)`;
	});

	beforeEach(async () => {
		await seedBase();
	});

	after(async () => {
		await sql.end({ timeout: 5 });
	});

	it("turns a history change log into hourly buckets and a daily row", async () => {
		stubHistory(historyForRideA());
		const summary = await finaliseDay();

		assert.equal(summary["failureCount"], 0, JSON.stringify(summary["failures"]));
		assert.ok((summary["processed"] as number) >= 1);

		const buckets = await sql<
			{ local_hour: number; operating_min: number; closed_min: number; wait_sum: number | null }[]
		>`
			select local_hour, operating_min, closed_min, wait_sum
			from ride_stats_hourly where ride_id = ${RIDE_A} order by bucket_start
		`;
		assert.equal(buckets.length, 24, "a full day of coverage");

		const ten = buckets.find((b) => b.local_hour === 10)!;
		assert.equal(ten.operating_min, 60);
		assert.equal(ten.wait_sum, 20 * 60);

		const [daily] = await sql<
			{
				operating_min: number;
				scheduled_min: number | null;
				down_min: number | null;
				wait_minutes: number;
				wait_sum: number;
				wait_dist: Record<string, number> | null;
				p50: string | null;
				p90: string | null;
				peak_hour: number | null;
			}[]
		>`
			select operating_min, scheduled_min, down_min, wait_minutes, wait_sum,
				   wait_dist, p50, p90, peak_hour
			from ride_stats_daily where ride_id = ${RIDE_A} and local_date = ${day}::date
		`;
		assert.ok(daily, "daily row written");

		// Only the two scheduled hours count.
		assert.equal(daily.operating_min, 120);
		assert.equal(daily.scheduled_min, 120);
		assert.equal(daily.down_min, 0);
		assert.equal(daily.wait_sum / daily.wait_minutes, 30, "mean of 20 and 40 over equal time");
		assert.equal(daily.peak_hour, 11);

		// wait_dist covers only OPERATING minutes, in minutes.
		assert.deepEqual(daily.wait_dist, { "20": 60, "40": 60 });
		assert.equal(Number(daily.p50), 20);
		assert.equal(Number(daily.p90), 40);
	});

	it("falls back to our own change log for rides the API omits", async () => {
		// Ride B is absent from the history payload but has poller data.
		await sql`
			insert into ride_changes (ride_id, ts, status, wait, source) values
				(${RIDE_B}, (${day} || 'T10:00:00Z')::timestamptz, ${RideStatus.OPERATING}, 15, ${ChangeSource.POLLER}),
				(${RIDE_B}, (${day} || 'T12:00:00Z')::timestamptz, ${RideStatus.CLOSED}, null, ${ChangeSource.POLLER})
		`;
		stubHistory(historyForRideA());

		const summary = await finaliseDay();
		assert.equal(summary["ridesFromOwnChanges"], 1);

		const [daily] = await sql<{ wait_sum: number; wait_minutes: number }[]>`
			select wait_sum, wait_minutes from ride_stats_daily
			where ride_id = ${RIDE_B} and local_date = ${day}::date
		`;
		assert.ok(daily, "ride B got a daily row from poller data");
		assert.equal(daily.wait_sum / daily.wait_minutes, 15);
	});

	it("deletes the day's raw changes only after recording it final", async () => {
		await sql`
			insert into ride_changes (ride_id, ts, status, wait, source)
			values (${RIDE_B}, (${day} || 'T10:00:00Z')::timestamptz, ${RideStatus.OPERATING}, 15, ${ChangeSource.POLLER})
		`;
		stubHistory(historyForRideA());
		await finaliseDay();

		const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ride_changes`;
		assert.equal(n, 0, "raw changes for a finalised day are gone");

		const [ingest] = await sql<
			{ status: number; source: number; finalised_at: Date | null }[]
		>`
			select status, source, finalised_at from park_day_ingest
			where park_id = ${PARK} and local_date = ${day}::date
		`;
		assert.equal(ingest!.status, IngestStatus.FINALISED);
		assert.equal(ingest!.source, ChangeSource.HISTORY_API);
		assert.ok(ingest!.finalised_at instanceof Date);
	});

	it("is idempotent: a second run reproduces the same numbers", async () => {
		stubHistory(historyForRideA());
		await finaliseDay();

		const snapshot = async () =>
			sql`select ride_id, local_date, operating_min, wait_sum, wait_minutes, wait_dist, p50
				from ride_stats_daily order by ride_id`;
		const first = await snapshot();

		// park_day_ingest is now finalised, so force a re-run of the same day.
		await sql`update park_day_ingest set finalised_at = null`;
		await finaliseDay();
		const second = await snapshot();

		assert.deepEqual(JSON.parse(JSON.stringify(second)), JSON.parse(JSON.stringify(first)));

		const [{ n }] = await sql<{ n: number }[]>`
			select count(*)::int as n from ride_stats_hourly where ride_id = ${RIDE_A}
		`;
		assert.equal(n, 24, "buckets replaced, not duplicated");
	});

	it("records a failure without finalising or deleting anything", async () => {
		await sql`
			insert into ride_changes (ride_id, ts, status, wait, source)
			values (${RIDE_B}, (${day} || 'T10:00:00Z')::timestamptz, ${RideStatus.OPERATING}, 15, ${ChangeSource.POLLER})
		`;
		(themeparks as { history: () => Promise<HistoryResponse | null> }).history = () =>
			Promise.reject(new Error("history exploded"));

		const summary = await finaliseDay();
		assert.ok((summary["failureCount"] as number) >= 1);

		const [ingest] = await sql<{ status: number; attempts: number; last_error: string | null }[]>`
			select status, attempts, last_error from park_day_ingest
			where park_id = ${PARK} and local_date = ${day}::date
		`;
		assert.equal(ingest!.status, IngestStatus.FAILED);
		assert.match(ingest!.last_error ?? "", /history exploded/);

		// The raw data is the only copy left, so it must survive a failed run.
		const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ride_changes`;
		assert.equal(n, 1, "raw changes kept for the retry");
	});

	it("treats a park with no recorded history as NO_HISTORY, not a failure", async () => {
		stubHistory(null);
		const summary = await finaliseDay();

		assert.equal(summary["failureCount"], 0);
		assert.ok((summary["parkDaysWithoutHistory"] as number) >= 1);

		const [ingest] = await sql<{ status: number }[]>`
			select status from park_day_ingest where park_id = ${PARK} and local_date = ${day}::date
		`;
		assert.equal(ingest!.status, IngestStatus.NO_HISTORY);
	});

	it("never replaces a ride's existing buckets with nothing", async () => {
		// Ride B's day as imported from v1: an hour of data and no raw changes behind it.
		const seedImported = () => sql`
			insert into ride_stats_hourly (
				ride_id, bucket_start, local_date, local_hour, operating_min, wait_minutes, wait_sum
			) values (
				${RIDE_B}, (${day} || 'T10:00:00Z')::timestamptz, ${day}::date, 10, 60, 60, 600
			)
		`;
		const importedBuckets = async () => {
			const [{ n }] = await sql<{ n: number }[]>`
				select count(*)::int as n from ride_stats_hourly where ride_id = ${RIDE_B}
			`;
			return n;
		};

		// History covering only ride A rewrites A and leaves B alone.
		await seedImported();
		stubHistory(historyForRideA());
		await finaliseDay();
		assert.equal(await importedBuckets(), 1);

		// No history at all leaves everything alone.
		await seedBase();
		await seedImported();
		stubHistory(null);
		await finaliseDay();
		assert.equal(await importedBuckets(), 1);
	});
});
