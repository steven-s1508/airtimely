import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { sql } from "../src/db/index.js";
import type {
	DestinationsResponse,
	EntityChildrenResponse,
	EntityData,
	EntityScheduleResponse,
} from "../src/lib/themeparks.js";
import { themeparks } from "../src/lib/themeparks.js";
import { entitySync } from "../src/worker/jobs/entitySync.js";
import { parkSync } from "../src/worker/jobs/parkSync.js";
import { scheduleSync } from "../src/worker/jobs/scheduleSync.js";

const PARK = "bbbbbbbb-0000-4000-8000-000000000001";

type Stubs = {
	destinations?: DestinationsResponse;
	entities?: Record<string, EntityData>;
	children?: EntityChildrenResponse;
	schedule?: EntityScheduleResponse;
};

function stub(s: Stubs): void {
	const t = themeparks as unknown as Record<string, unknown>;
	if (s.destinations) t["destinations"] = () => Promise.resolve(s.destinations);
	if (s.entities)
		t["entity"] = (id: string) => {
			const e = s.entities![id];
			return e ? Promise.resolve(e) : Promise.reject(new Error(`no entity ${id}`));
		};
	if (s.children) t["children"] = () => Promise.resolve(s.children);
	if (s.schedule) t["schedule"] = () => Promise.resolve(s.schedule);
}

async function reset(): Promise<void> {
	await sql`delete from ride_stats_daily`;
	await sql`delete from ride_stats_hourly`;
	await sql`delete from ride_changes`;
	await sql`delete from ride_live`;
	await sql`delete from park_day_ingest`;
	await sql`delete from parks_schedule`;
	await sql`delete from show_times`;
	await sql`delete from rides`;
	await sql`delete from shows`;
	await sql`delete from restaurants`;
	await sql`delete from parks`;
	await sql`delete from destinations`;
}

async function seedPark(timezone = "Europe/Berlin"): Promise<void> {
	await sql`
		insert into parks (id, name, slug, timezone, external_id, is_active)
		values (${PARK}, 'Test Park', 'test-park', ${timezone}, 'ext-park', true)
	`;
}

describe("park sync", () => {
	beforeEach(reset);

	it("inserts a destination and its park", async () => {
		stub({
			destinations: { destinations: [{ id: "ext-dest", name: "Test Resort", parks: [{ id: "ext-park", name: "Test Park" }] }] },
			entities: {
				"ext-dest": { id: "ext-dest", name: "Test Resort", entityType: "DESTINATION", timezone: "Europe/Berlin" },
				"ext-park": { id: "ext-park", name: "Test Park", entityType: "PARK", timezone: "Europe/Berlin" },
			},
		});

		const summary = await parkSync();
		assert.equal(summary["failureCount"], 0, JSON.stringify(summary["failures"]));
		assert.equal(summary["inserted"], 1);

		const [park] = await sql<{ name: string; timezone: string; is_destination: boolean }[]>`
			select name, timezone, is_destination from parks where external_id = 'ext-park'
		`;
		assert.equal(park!.timezone, "Europe/Berlin");
		// A destination with exactly one park is presented as the park itself.
		assert.equal(park!.is_destination, true);
	});

	it("writes a changed timezone, which v1 silently ignored", async () => {
		await seedPark("Europe/Brussels");
		stub({
			destinations: { destinations: [{ id: "ext-dest", name: "Test Resort", parks: [{ id: "ext-park", name: "Test Park" }] }] },
			entities: {
				"ext-dest": { id: "ext-dest", name: "Test Resort", entityType: "DESTINATION", timezone: "Europe/Berlin" },
				// Same name, different timezone: v1's change check looked at name,
				// external_id and is_destination only, so this never got written.
				"ext-park": { id: "ext-park", name: "Test Park", entityType: "PARK", timezone: "Europe/Berlin" },
			},
		});

		const summary = await parkSync();
		assert.equal(summary["timezoneChanges"], 1);

		const [park] = await sql<{ timezone: string }[]>`
			select timezone from parks where external_id = 'ext-park'
		`;
		assert.equal(park!.timezone, "Europe/Berlin");
	});

	it("does not deactivate anything when part of the sweep failed", async () => {
		await seedPark();
		await sql`
			insert into parks (id, name, slug, timezone, external_id, is_active)
			values (gen_random_uuid(), 'Other Park', 'other', 'UTC', 'ext-other', true)
		`;
		stub({
			destinations: { destinations: [{ id: "ext-dest", name: "Test Resort", parks: [{ id: "ext-park", name: "Test Park" }] }] },
			entities: {}, // every lookup throws
		});

		const summary = await parkSync();
		assert.ok((summary["failureCount"] as number) > 0);
		assert.equal(summary["deactivated"], 0, "a partial listing must not deactivate the world");

		const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from parks where is_active`;
		assert.equal(n, 2);
	});
});

describe("entity sync", () => {
	beforeEach(async () => {
		await reset();
		await seedPark();
	});

	it("stores rides, shows and restaurants from one children response", async () => {
		stub({
			children: {
				id: "ext-park",
				name: "Test Park",
				children: [
					{ id: "ext-a", name: "Coaster", entityType: "ATTRACTION" },
					{ id: "cccccccc-0000-4000-8000-00000000000c", name: "Parade", entityType: "SHOW" },
					{ id: "dddddddd-0000-4000-8000-00000000000d", name: "Diner", entityType: "RESTAURANT" },
					{ id: "ext-hotel", name: "Hotel", entityType: "HOTEL" },
				],
			},
		});

		const summary = await entitySync();
		assert.equal(summary["failureCount"], 0, JSON.stringify(summary["failures"]));

		// v1 filtered /children to ATTRACTION and left shows and restaurants empty.
		assert.deepEqual(summary["rides"], { inserted: 1, updated: 0, reactivated: 0, deactivated: 0 });
		assert.deepEqual(summary["shows"], { inserted: 1, updated: 0, reactivated: 0, deactivated: 0 });
		assert.deepEqual(summary["restaurants"], { inserted: 1, updated: 0, reactivated: 0, deactivated: 0 });

		const [ride] = await sql<{ name: string; slug: string }[]>`
			select name, slug from rides where external_id = 'ext-a'
		`;
		assert.equal(ride!.slug, "coaster");
	});

	it("deactivates a ride the API stopped listing, without deleting it", async () => {
		stub({
			children: { id: "ext-park", name: "Test Park", children: [{ id: "ext-a", name: "Coaster", entityType: "ATTRACTION" }] },
		});
		await entitySync();

		stub({
			children: { id: "ext-park", name: "Test Park", children: [{ id: "ext-b", name: "New Ride", entityType: "ATTRACTION" }] },
		});
		const summary = await entitySync();
		assert.equal((summary["rides"] as Record<string, number>)["deactivated"], 1);

		const rows = await sql<{ external_id: string; is_active: boolean }[]>`
			select external_id, is_active from rides order by external_id
		`;
		// The row survives: it carries years of statistics behind a foreign key.
		assert.equal(rows.length, 2);
		assert.equal(rows.find((r) => r.external_id === "ext-a")!.is_active, false);
	});

	it("reactivates a ride that comes back", async () => {
		stub({ children: { id: "ext-park", name: "Test Park", children: [{ id: "ext-a", name: "Coaster", entityType: "ATTRACTION" }] } });
		await entitySync();
		await sql`update rides set is_active = false`;

		const summary = await entitySync();
		assert.equal((summary["rides"] as Record<string, number>)["reactivated"], 1);

		const [{ is_active }] = await sql<{ is_active: boolean }[]>`
			select is_active from rides where external_id = 'ext-a'
		`;
		assert.equal(is_active, true);
	});

	it("leaves everything alone when a park returns no children at all", async () => {
		stub({ children: { id: "ext-park", name: "Test Park", children: [{ id: "ext-a", name: "Coaster", entityType: "ATTRACTION" }] } });
		await entitySync();

		// An empty response is a bad response, not a park that lost every ride.
		stub({ children: { id: "ext-park", name: "Test Park", children: [] } });
		const summary = await entitySync();
		assert.equal((summary["rides"] as Record<string, number>)["deactivated"], 0);

		const [{ is_active }] = await sql<{ is_active: boolean }[]>`
			select is_active from rides where external_id = 'ext-a'
		`;
		assert.equal(is_active, true);
	});
});

describe("schedule sync", () => {
	beforeEach(async () => {
		await reset();
		await seedPark();
	});

	it("stores opening hours as timestamptz", async () => {
		stub({
			schedule: {
				id: "ext-park",
				name: "Test Park",
				schedule: [
					{ date: "2026-09-20", type: "OPERATING", openingTime: "2026-09-20T09:00:00+02:00", closingTime: "2026-09-20T20:00:00+02:00" },
				],
			},
		});

		const summary = await scheduleSync();
		assert.equal(summary["entriesWritten"], 1);

		const [row] = await sql<{ opening_time: Date; closing_time: Date; local_date: string }[]>`
			select opening_time, closing_time, local_date::text as local_date from parks_schedule
		`;
		// Stored as an instant: 09:00+02:00 is 07:00 UTC.
		assert.equal(row!.opening_time.toISOString(), "2026-09-20T07:00:00.000Z");
		assert.equal(row!.local_date, "2026-09-20");
	});

	it("replaces only the dates the API returned", async () => {
		await sql`
			insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
			values
				(${PARK}, '2026-09-20', 'OPERATING', '2026-09-20T07:00:00Z', '2026-09-20T18:00:00Z'),
				(${PARK}, '2026-09-25', 'OPERATING', '2026-09-25T07:00:00Z', '2026-09-25T18:00:00Z')
		`;
		stub({
			schedule: {
				id: "ext-park",
				name: "Test Park",
				schedule: [
					{ date: "2026-09-20", type: "OPERATING", openingTime: "2026-09-20T08:00:00Z", closingTime: "2026-09-20T22:00:00Z" },
				],
			},
		});

		await scheduleSync();

		const rows = await sql<{ local_date: string; closing_time: Date }[]>`
			select local_date::text as local_date, closing_time from parks_schedule order by local_date
		`;
		assert.equal(rows.length, 2);
		// 09-20 replaced...
		assert.equal(rows[0]!.closing_time.toISOString(), "2026-09-20T22:00:00.000Z");
		// ...and 09-25 untouched, because the API said nothing about it.
		assert.equal(rows[1]!.local_date, "2026-09-25");
	});

	it("skips an unknown schedule type without losing the park's other entries", async () => {
		stub({
			schedule: {
				id: "ext-park",
				name: "Test Park",
				schedule: [
					{ date: "2026-09-20", type: "OPERATING", openingTime: "2026-09-20T08:00:00Z", closingTime: "2026-09-20T20:00:00Z" },
					{ date: "2026-09-20", type: "BRAND_NEW_KIND", openingTime: null, closingTime: null },
				],
			},
		});

		const summary = await scheduleSync();
		assert.equal(summary["failureCount"], 0, "an unknown type must not fail the park");
		assert.equal(summary["entriesWritten"], 1);
		assert.deepEqual(summary["unknownTypes"], { BRAND_NEW_KIND: 1 });

		const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from parks_schedule`;
		assert.equal(n, 1);
	});

	it("stores PARK_OPEN as an operating window", async () => {
		// Some parks express opening hours only as PARK_OPEN. v1's CHECK constraint
		// rejected it, which failed the whole park's insert and left Universal Studios
		// Singapore with no schedule at all, hence NULL uptime on every ride-day.
		stub({
			schedule: {
				id: "ext-park",
				name: "Test Park",
				schedule: [
					{ date: "2026-09-21", type: "PARK_OPEN", openingTime: "2026-09-21T10:00:00+08:00", closingTime: "2026-09-21T18:00:00+08:00" },
				],
			},
		});

		const summary = await scheduleSync();
		assert.equal(summary["entriesWritten"], 1);
		assert.deepEqual(summary["normalisedTypes"], { PARK_OPEN: 1 });
		assert.deepEqual(summary["unknownTypes"], {});

		const [row] = await sql<{ type: string; opening_time: Date }[]>`
			select type::text as type, opening_time from parks_schedule
		`;
		assert.equal(row!.type, "OPERATING", "must count toward uptime");
		assert.equal(row!.opening_time.toISOString(), "2026-09-21T02:00:00.000Z");
	});

	it("treats a valid empty schedule as success", async () => {
		stub({ schedule: { id: "ext-park", name: "Test Park", schedule: [] } });
		const summary = await scheduleSync();
		assert.equal(summary["failureCount"], 0);
		assert.equal(summary["parksWithoutSchedule"], 1);
	});
});

after(async () => {
	await sql.end({ timeout: 5 });
});
