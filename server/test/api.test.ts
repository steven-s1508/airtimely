import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import app from "../src/api/index.js";
import { sql } from "../src/db/index.js";
import { ChangeSource, RideStatus } from "../src/db/schema/enums.js";
import { cacheStats, cached, clearCache, invalidateTag } from "../src/lib/cache.js";
import { ensurePartitions } from "../src/worker/jobs/maintenance.js";

const DEST = "eeeeeeee-0000-4000-8000-00000000000e";
const PARK = "eeeeeeee-0000-4000-8000-000000000001";
const PARK2 = "eeeeeeee-0000-4000-8000-000000000002";
const PARK3 = "eeeeeeee-0000-4000-8000-000000000003";
const RIDE = "eeeeeeee-0000-4000-8000-00000000000a";

describe("response cache", () => {
	beforeEach(clearCache);

	it("misses once then hits, with a stable etag", async () => {
		let builds = 0;
		const build = () => {
			builds++;
			return Promise.resolve({ value: 42 });
		};

		const first = await cached("k", ["tag"], 60, build);
		const second = await cached("k", ["tag"], 60, build);

		assert.equal(first.hit, false);
		assert.equal(second.hit, true);
		assert.equal(builds, 1, "a hit must not touch the database");
		assert.equal(first.etag, second.etag);
	});

	it("evicts only the tagged entries", async () => {
		await cached("park:a", ["a"], 60, () => Promise.resolve(1));
		await cached("park:b", ["b"], 60, () => Promise.resolve(2));
		await cached("stats", [], 60, () => Promise.resolve(3));

		assert.equal(invalidateTag("a"), 1);

		assert.equal((await cached("park:a", ["a"], 60, () => Promise.resolve(1))).hit, false);
		assert.equal((await cached("park:b", ["b"], 60, () => Promise.resolve(2))).hit, true);
		assert.equal((await cached("stats", [], 60, () => Promise.resolve(3))).hit, true);
	});

	it("expires by ttl as a backstop for a missed notification", async () => {
		await cached("k", [], 0, () => Promise.resolve(1));
		const again = await cached("k", [], 0, () => Promise.resolve(1));
		assert.equal(again.hit, false);
	});

	it("does not leak tag bookkeeping when entries are replaced", async () => {
		for (let i = 0; i < 5; i++) {
			await cached("k", ["t"], 0, () => Promise.resolve(i));
		}
		const stats = cacheStats();
		assert.equal(stats.entries, 1);
		assert.equal(stats.tags, 1);
	});

	it("changes the etag when the content changes", async () => {
		const a = await cached("k", [], 60, () => Promise.resolve({ n: 1 }));
		clearCache();
		const b = await cached("k", [], 60, () => Promise.resolve({ n: 2 }));
		assert.notEqual(a.etag, b.etag);
	});
});

describe("api routes", () => {
	before(async () => {
		await ensurePartitions();
		clearCache();

		await sql`delete from ride_stats_daily`;
		await sql`delete from ride_stats_hourly`;
		await sql`delete from ride_changes`;
		await sql`delete from ride_live`;
		await sql`delete from parks_schedule`;
		await sql`delete from rides`;
		await sql`delete from parks`;
		await sql`delete from destinations`;

		await sql`insert into destinations (id, name, slug, timezone) values (${DEST}, 'Resort', 'resort', 'UTC')`;
		await sql`
			insert into parks (id, destination_id, name, slug, timezone, external_id, is_destination, country_code)
			values
				(${PARK}, ${DEST}, 'Alpha Park', 'alpha', 'UTC', 'ext-1', false, 'DE'),
				(${PARK2}, ${DEST}, 'Beta Park', 'beta', 'UTC', 'ext-2', false, 'DE')
		`;
		// Standalone, and between open days: its schedule resumes in three days.
		await sql`
			insert into parks (id, name, slug, timezone, external_id)
			values (${PARK3}, 'Gamma Park', 'gamma', 'UTC', 'ext-3')
		`;
		await sql`
			insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
			values (${PARK3}, (now() at time zone 'UTC')::date + 3, 'OPERATING',
					now() + interval '3 days', now() + interval '3 days 8 hours')
		`;
		await sql`insert into rides (id, park_id, name, external_id) values (${RIDE}, ${PARK}, 'Coaster', 'ext-a')`;

		// An operating window covering now, so the park reads as open.
		await sql`
			insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
			values (${PARK}, (now() at time zone 'UTC')::date, 'OPERATING',
					now() - interval '1 hour', now() + interval '6 hours')
		`;
		await sql`
			insert into ride_live (ride_id, status, wait_minutes, polled_at)
			values (${RIDE}, ${RideStatus.OPERATING}, 25, now())
		`;
		await sql`
			insert into ride_changes (ride_id, ts, status, wait, source)
			values (${RIDE}, now() - interval '30 minutes', ${RideStatus.OPERATING}, 25, ${ChangeSource.POLLER})
		`;
		await sql`
			insert into ride_stats_daily (
				ride_id, local_date, operating_min, scheduled_min, down_min,
				wait_minutes, wait_sum, wait_min, wait_max, wait_dist, p50, p90
			) values (
				${RIDE}, (now() at time zone 'UTC')::date - 1, 600, 600, 0,
				600, 12000, 5, 40, ${sql.json({ "10": 200, "20": 200, "30": 200 })}, 20, 30
			)
		`;
		await sql`
			insert into ride_stats_hourly (
				ride_id, bucket_start, local_date, local_hour,
				operating_min, wait_minutes, wait_sum, wait_min, wait_max
			) values (
				${RIDE},
				(((now() at time zone 'UTC')::date - 1) + interval '12 hours')::timestamp at time zone 'UTC',
				(now() at time zone 'UTC')::date - 1, 12, 60, 60, 1200, 15, 25
			)
		`;
	});

	after(async () => {
		await sql.end({ timeout: 5 });
	});

	it("groups parks under their destination and resolves open/closed", async () => {
		const res = await app.request("/v1/home");
		assert.equal(res.status, 200);
		const body = (await res.json()) as { entities: { kind: string; status: string; parks: unknown[] }[] };

		assert.equal(body.entities.length, 2, "two parks of one destination form one group");
		const group = body.entities.find((e) => e.kind === "destination")!;
		assert.equal(group.kind, "destination");
		assert.equal(group.parks.length, 2);
		// Alpha is open now; the group is open when any park is.
		assert.equal(group.status, "open");
	});

	it("reports unknown, not closed, for a park with no schedule", async () => {
		const res = await app.request("/v1/home");
		const body = (await res.json()) as { entities: { parks: { name: string; status: string }[] }[] };
		const beta = body.entities.flatMap((e) => e.parks).find((p) => p.name === "Beta Park")!;
		// Saying "Closed" here would be a guess about hours we do not have.
		assert.equal(beta.status, "unknown");
	});

	it("reports closed for a park that publishes a schedule but has no entry today", async () => {
		const res = await app.request("/v1/home");
		const body = (await res.json()) as { entities: { parks: { name: string; status: string }[] }[] };
		const gamma = body.entities.flatMap((e) => e.parks).find((p) => p.name === "Gamma Park")!;
		// The API lists only open days, so a gap in a published schedule is a closed day.
		assert.equal(gamma.status, "closed");
	});

	it("returns a park with its schedule and live waits in one call", async () => {
		const res = await app.request(`/v1/parks/${PARK}`);
		assert.equal(res.status, 200);
		const body = (await res.json()) as {
			park: { status: string; schedule: unknown[] };
			rides: { name: string; status: string; waitMinutes: number }[];
		};
		assert.equal(body.park.status, "open");
		assert.equal(body.park.schedule.length, 1);
		assert.equal(body.rides[0]!.name, "Coaster");
		// Codes are storage; the wire carries names.
		assert.equal(body.rides[0]!.status, "OPERATING");
		assert.equal(body.rides[0]!.waitMinutes, 25);
	});

	it("returns a ride with live state and today's changes", async () => {
		const res = await app.request(`/v1/rides/${RIDE}`);
		const body = (await res.json()) as {
			parkName: string;
			live: { status: string; waitMinutes: number };
			today: unknown[];
		};
		assert.equal(body.parkName, "Alpha Park");
		assert.equal(body.live.status, "OPERATING");
		assert.equal(body.today.length, 1);
	});

	it("computes percentiles from the combined wait_dist, not from daily p50s", async () => {
		const res = await app.request(`/v1/rides/${RIDE}/stats`);
		const body = (await res.json()) as {
			hourOfDay: (number | null)[];
			percentiles: { p25: number; p50: number; p90: number };
			years: number[];
		};
		assert.equal(body.hourOfDay.length, 24);
		assert.equal(body.hourOfDay[12], 20, "1200 / 60");
		// 200 minutes each at 10/20/30: p50 is 20, p90 is 30.
		assert.deepEqual(body.percentiles, { p25: 10, p50: 20, p90: 30 });
		assert.ok(body.years.length >= 1);
	});

	it("serves one past day's curve", async () => {
		const [{ d }] = await sql<{ d: string }[]>`
			select ((now() at time zone 'UTC')::date - 1)::text as d
		`;
		const res = await app.request(`/v1/rides/${RIDE}/day?date=${d}`);
		const body = (await res.json()) as {
			hours: { localHour: number; mean: number }[];
			summary: { mean: number; scheduledMin: number };
		};
		assert.equal(body.hours.length, 1);
		assert.equal(body.hours[0]!.mean, 20);
		assert.equal(body.summary.mean, 20);
		assert.equal(body.summary.scheduledMin, 600);
	});

	it("answers 304 with no body when the client's etag still matches", async () => {
		const first = await app.request(`/v1/parks/${PARK}`);
		const etag = first.headers.get("etag")!;
		assert.ok(etag);

		const second = await app.request(`/v1/parks/${PARK}`, { headers: { "if-none-match": etag } });
		assert.equal(second.status, 304);
		assert.equal(await second.text(), "");

		const stale = await app.request(`/v1/parks/${PARK}`, { headers: { "if-none-match": 'W/"x"' } });
		assert.equal(stale.status, 200);
		assert.ok((await stale.text()).length > 0);
	});

	it("re-reads a park after its cache tag is invalidated", async () => {
		await app.request(`/v1/parks/${PARK}`);
		assert.equal((await app.request(`/v1/parks/${PARK}`)).headers.get("x-cache"), "HIT");

		// What the worker's NOTIFY triggers after a poll.
		invalidateTag(PARK);
		assert.equal((await app.request(`/v1/parks/${PARK}`)).headers.get("x-cache"), "MISS");
	});

	it("rejects malformed input and reports missing rows", async () => {
		assert.equal((await app.request("/v1/parks/nope")).status, 400);
		assert.equal((await app.request("/v1/rides/nope")).status, 400);
		assert.equal((await app.request(`/v1/rides/${RIDE}/day`)).status, 400);
		assert.equal((await app.request(`/v1/rides/${RIDE}/day?date=13-13-13`)).status, 400);
		assert.equal((await app.request(`/v1/rides/${RIDE}/stats?year=abc`)).status, 400);
		assert.equal((await app.request("/v1/rides/eeeeeeee-0000-4000-8000-0000000000ff")).status, 404);
		assert.equal((await app.request("/v1/parks/eeeeeeee-0000-4000-8000-0000000000ff")).status, 404);
	});
});
