import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { sql } from "../src/db/index.js";
import { rollupParkDay } from "../src/lib/stats/rollup.ts";

/**
 * Parity gate for the Phase 4 rollup port.
 *
 * Each case is a real ride-day taken from the live v1 database *after* patches _02.._06
 * corrected it. We rebuild `ride_stats_hourly` from the stored `hourly_data` and require
 * the new rollup to reproduce v1's corrected daily figures.
 *
 * Reconstruction is faithful because v1's `avg` was already the mean over OPERATING
 * samples and `op` its operating minutes, so wait_sum = avg * op.
 *
 * Two statistics deliberately do NOT match and are not asserted:
 *   - the median: v1 took the median *of hourly averages*, unweighted. v2's p50 comes
 *     from wait_dist, which historic days do not have.
 *   - p25/p90: likewise absent for historic days.
 */

type Case = {
	label: string;
	note?: string;
	rideId: string;
	parkId: string;
	parkName: string;
	timezone: string;
	localDate: string;
	hourlyData: {
		h: number;
		avg: number | null;
		avg_s: number | null;
		min: number | null;
		max: number | null;
		op: number | null;
		data: number | null;
	}[];
	schedule: {
		date: string;
		type: string;
		opening_time: string | null;
		closing_time: string | null;
	}[];
	expected: {
		avg: number | null;
		uptime: number | null;
		downtime: number | null;
		min: number | null;
		max: number | null;
		peakHour: number | null;
		quietestHour: number | null;
	};
};

const cases: Case[] = JSON.parse(
	readFileSync(path.join(import.meta.dirname, "fixtures/rollup-parity.json"), "utf8"),
);

/** Seeds one case's park, ride, schedule and reconstructed hourly buckets. */
async function seed(c: Case): Promise<void> {
	await sql`
		insert into parks (id, name, slug, timezone, external_id)
		values (${c.parkId}, ${c.parkName}, ${c.parkId}, ${c.timezone}, ${c.parkId})
		on conflict (id) do update set timezone = excluded.timezone
	`;
	await sql`
		insert into rides (id, park_id, name, external_id)
		values (${c.rideId}, ${c.parkId}, ${c.label}, ${c.rideId})
		on conflict (id) do nothing
	`;

	for (const s of c.schedule) {
		await sql`
			insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
			values (${c.parkId}, ${s.date}, 'OPERATING', ${s.opening_time}, ${s.closing_time})
			on conflict do nothing
		`;
	}

	const buckets = c.hourlyData.map((h) => ({
		ride_id: c.rideId,
		// The instant the park-local hour begins.
		local_hour: h.h,
		local_date: c.localDate,
		operating_min: h.op ?? 0,
		wait_minutes: h.avg === null ? 0 : (h.op ?? 0),
		wait_sum: h.avg === null ? null : Math.round(h.avg * (h.op ?? 0)),
		wait_min: h.min,
		wait_max: h.max,
		single_mean: h.avg_s,
	}));

	await sql`
		insert into ride_stats_hourly (
			ride_id, bucket_start, local_date, local_hour,
			operating_min, wait_minutes, wait_sum, wait_min, wait_max, single_mean
		)
		select
			b.ride_id,
			((b.local_date::date + make_interval(hours => b.local_hour))::timestamp
				at time zone ${c.timezone}),
			b.local_date::date,
			b.local_hour,
			b.operating_min, b.wait_minutes, b.wait_sum, b.wait_min, b.wait_max, b.single_mean
		from jsonb_to_recordset(${sql.json(buckets)}::jsonb) as b(
			ride_id uuid, local_hour smallint, local_date text,
			operating_min smallint, wait_minutes smallint, wait_sum int,
			wait_min smallint, wait_max smallint, single_mean numeric
		)
		on conflict (ride_id, bucket_start) do nothing
	`;
}

/**
 * True when v1's hour and ours are indistinguishable on the keys v1 sorted by, i.e.
 * v1 picked one arbitrary member of a tied group.
 */
function tiesWith(c: Case, got: number | null, want: number | null, kind: "peak" | "quiet"): boolean {
	if (got === null || want === null) return false;
	const hour = (h: number) => c.hourlyData.find((x) => x.h === h);
	const a = hour(got);
	const b = hour(want);
	if (!a || !b) return false;
	if (a.avg !== b.avg) return false;
	return kind === "peak" ? a.max === b.max : a.min === b.min;
}

function round2(value: number | null): number | null {
	return value === null ? null : Math.round(value * 100) / 100;
}

describe("rollup parity against corrected v1 data", () => {
	before(async () => {
		await sql`delete from ride_stats_daily`;
		await sql`delete from ride_stats_hourly`;
		await sql`delete from parks_schedule`;
		await sql`delete from ride_live`;
		await sql`delete from ride_changes`;
		await sql`delete from rides`;
		await sql`delete from parks`;
		await sql`delete from destinations`;
		for (const c of cases) await seed(c);
	});

	after(async () => {
		await sql.end({ timeout: 5 });
	});

	it("has fixtures spanning several timezones and both edge cases", () => {
		assert.ok(cases.length >= 12, `expected >= 12 cases, got ${cases.length}`);
		const zones = new Set(cases.map((c) => c.timezone));
		assert.ok(zones.size >= 4, `expected >= 4 timezones, got ${[...zones].join(", ")}`);
		assert.ok(cases.some((c) => c.note === "no-schedule"), "need a no-schedule case");
		assert.ok(cases.some((c) => c.note === "past-midnight"), "need a past-midnight case");
	});

	// The day named in DECISIONS.md §9, with the values the patches produced.
	it("reproduces the golden day: Space Mountain 2026-09-12", async () => {
		const golden = cases.find((c) => c.note === "golden");
		assert.ok(golden, "golden fixture missing");
		assert.equal(golden.expected.avg, 31.61, "fixture drifted from DECISIONS.md");
		assert.equal(golden.expected.uptime, 100);
		assert.equal(golden.expected.downtime, 0);

		await rollupParkDay(golden.parkId, golden.localDate);

		const [row] = await sql<
			{
				operating_min: number;
				down_min: number | null;
				scheduled_min: number | null;
				wait_minutes: number;
				wait_sum: number;
			}[]
		>`
			select operating_min, down_min, scheduled_min, wait_minutes, wait_sum
			from ride_stats_daily
			where ride_id = ${golden.rideId} and local_date = ${golden.localDate}
		`;
		assert.ok(row, "no daily row produced");

		const mean = round2(row.wait_sum / row.wait_minutes);
		const uptime = round2(Math.min(100, (row.operating_min * 100) / row.scheduled_min!));

		assert.equal(mean, 31.61, "mean wait");
		assert.equal(uptime, 100, "uptime");
		assert.equal(row.down_min, 0, "downtime");
	});

	it("reproduces every fixture's mean, uptime, downtime, range and peak hours", async () => {
		const mismatches: string[] = [];
		const ties: string[] = [];

		for (const c of cases) {
			await rollupParkDay(c.parkId, c.localDate);

			const [row] = await sql<
				{
					operating_min: number;
					down_min: number | null;
					scheduled_min: number | null;
					wait_minutes: number | null;
					wait_sum: number | null;
					wait_min: number | null;
					wait_max: number | null;
					peak_hour: number | null;
					quietest_hour: number | null;
				}[]
			>`
				select operating_min, down_min, scheduled_min, wait_minutes, wait_sum,
					   wait_min, wait_max, peak_hour, quietest_hour
				from ride_stats_daily
				where ride_id = ${c.rideId} and local_date = ${c.localDate}
			`;

			if (!row) {
				mismatches.push(`${c.label}: no daily row produced`);
				continue;
			}

			const mean =
				row.wait_minutes && row.wait_sum !== null ? round2(row.wait_sum / row.wait_minutes) : null;
			const uptime =
				row.scheduled_min && row.scheduled_min > 0
					? round2(Math.min(100, (row.operating_min * 100) / row.scheduled_min))
					: null;

			const check = (field: string, got: unknown, want: unknown) => {
				if (got !== want) mismatches.push(`${c.label}: ${field} got ${got}, expected ${want}`);
			};
			const checkHourOrTie = (
				field: string,
				got: number | null,
				want: number | null,
				kase: Case,
				kind: "peak" | "quiet",
			) => {
				if (got === want) return;
				if (tiesWith(kase, got, want, kind)) {
					ties.push(`${kase.label}: ${field} ${got} ties v1's ${want}`);
					return;
				}
				mismatches.push(`${kase.label}: ${field} got ${got}, expected ${want}`);
			};

			check("mean", mean, round2(c.expected.avg));
			check("uptime", uptime, c.expected.uptime === null ? null : round2(c.expected.uptime));
			check("downtime", row.down_min, c.expected.downtime);
			check("min", row.wait_min, c.expected.min);
			check("max", row.wait_max, c.expected.max);
			// v1 ordered peak/quietest on (mean, extreme) alone, so a run of hours sharing
			// both resolved arbitrarily. v2 adds bucket_start to make the choice
			// deterministic; where v1's pick ties with ours on the ordering keys, either
			// answer is equally correct and only the tie itself is asserted.
			checkHourOrTie("peakHour", row.peak_hour, c.expected.peakHour, c, "peak");
			checkHourOrTie("quietestHour", row.quietest_hour, c.expected.quietestHour, c, "quiet");
		}

		assert.deepEqual(mismatches, [], `\n  ${mismatches.join("\n  ")}\n`);
	});

	it("leaves uptime and downtime NULL when the day has no schedule", async () => {
		const noSched = cases.filter((c) => c.note === "no-schedule");
		for (const c of noSched) {
			const [row] = await sql<{ down_min: number | null; scheduled_min: number | null }[]>`
				select down_min, scheduled_min from ride_stats_daily
				where ride_id = ${c.rideId} and local_date = ${c.localDate}
			`;
			assert.ok(row, `${c.label}: no row`);
			// Unknown, never guessed and never zero.
			assert.equal(row.scheduled_min, null, `${c.label}: scheduled_min`);
			assert.equal(row.down_min, null, `${c.label}: down_min`);
		}
	});

	it("writes no percentiles for historic days, which have no wait_dist", async () => {
		const [row] = await sql<{ n: number }[]>`
			select count(*)::int as n from ride_stats_daily
			where wait_dist is not null or p50 is not null
		`;
		assert.equal(row!.n, 0);
	});
});
