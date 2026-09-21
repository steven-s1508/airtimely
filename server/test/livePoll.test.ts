import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { sql } from "../src/db/index.js";
import { RideStatus } from "../src/db/schema/enums.js";
import { withAdvisoryLock } from "../src/lib/locks.js";
import type { EntityLiveData, EntityLiveDataResponse } from "../src/lib/themeparks.js";
import { themeparks } from "../src/lib/themeparks.js";
import { livePoll } from "../src/worker/jobs/livePoll.js";
import { ensurePartitions } from "../src/worker/jobs/maintenance.js";

const PARK = "22222222-2222-2222-2222-222222222222";
const DEST = "11111111-1111-1111-1111-111111111111";
const RIDE_A = "33333333-3333-3333-3333-333333333333";
const RIDE_B = "44444444-4444-4444-4444-444444444444";

/** Replaces the client's live() with a fixed payload for the next poll. */
function stubLive(entities: EntityLiveData[]): void {
	(themeparks as { live: (id: string) => Promise<EntityLiveDataResponse> }).live = () =>
		Promise.resolve({ id: "ext-park", name: "Test Park", entityType: "PARK", liveData: entities });
}

function attraction(id: string, status: string, wait: number | null): EntityLiveData {
	return {
		id,
		name: id,
		entityType: "ATTRACTION",
		status: status as EntityLiveData["status"],
		lastUpdated: new Date().toISOString(),
		queue: { STANDBY: { waitTime: wait } },
	};
}

async function changeCount(): Promise<number> {
	const [row] = await sql<{ n: number }[]>`select count(*)::int as n from ride_changes`;
	return row!.n;
}

describe("live poll", () => {
	before(async () => {
		await ensurePartitions();
		await sql`delete from ride_changes`;
		await sql`delete from ride_live`;
		await sql`delete from parks_schedule`;
		await sql`delete from rides`;
		await sql`delete from parks`;
		await sql`delete from destinations`;

		await sql`
			insert into destinations (id, name, slug, timezone)
			values (${DEST}, 'Test Dest', 'test-dest', 'Europe/Berlin')
		`;
		await sql`
			insert into parks (id, destination_id, name, slug, timezone, external_id)
			values (${PARK}, ${DEST}, 'Test Park', 'test-park', 'Europe/Berlin', 'ext-park')
		`;
		await sql`
			insert into rides (id, park_id, name, external_id) values
				(${RIDE_A}, ${PARK}, 'Ride A', 'ext-a'),
				(${RIDE_B}, ${PARK}, 'Ride B', 'ext-b')
		`;
		// An OPERATING window spanning now, so the park counts as in-window.
		await sql`
			insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
			values (
				${PARK},
				(now() at time zone 'Europe/Berlin')::date,
				'OPERATING',
				now() - interval '2 hours',
				now() + interval '6 hours'
			)
		`;
	});

	after(async () => {
		await sql.end({ timeout: 5 });
	});

	it("records one change per ride on the first poll", async () => {
		stubLive([attraction("ext-a", "OPERATING", 10), attraction("ext-b", "OPERATING", 20)]);
		const summary = await livePoll();

		assert.equal(summary["parksPolled"], 1);
		assert.equal(summary["ridesSeen"], 2);
		assert.equal(summary["changesRecorded"], 2);
		assert.equal(await changeCount(), 2);

		const live = await sql<{ ride_id: string; status: number; wait_minutes: number }[]>`
			select ride_id, status, wait_minutes from ride_live order by wait_minutes
		`;
		assert.equal(live.length, 2);
		assert.equal(live[0]!.status, RideStatus.OPERATING);
		assert.equal(live[0]!.wait_minutes, 10);
	});

	it("records nothing when the state is unchanged", async () => {
		stubLive([attraction("ext-a", "OPERATING", 10), attraction("ext-b", "OPERATING", 20)]);
		const summary = await livePoll();

		assert.equal(summary["changesRecorded"], 0);
		// This is the write-amplification fix: v1 would have written 2 more rows here.
		assert.equal(await changeCount(), 2);
	});

	it("records only the ride that actually moved", async () => {
		stubLive([attraction("ext-a", "OPERATING", 45), attraction("ext-b", "OPERATING", 20)]);
		const summary = await livePoll();

		assert.equal(summary["changesRecorded"], 1);
		assert.equal(await changeCount(), 3);
	});

	it("treats a status change with an unchanged wait as a change", async () => {
		// Rides keep displaying their last wait while DOWN, so status alone must count.
		stubLive([attraction("ext-a", "DOWN", 45), attraction("ext-b", "OPERATING", 20)]);
		const summary = await livePoll();

		assert.equal(summary["changesRecorded"], 1);
		const [row] = await sql<{ status: number }[]>`
			select status from ride_changes where ride_id = ${RIDE_A} order by ts desc limit 1
		`;
		assert.equal(row!.status, RideStatus.DOWN);
	});

	it("treats a wait going null as a change", async () => {
		stubLive([attraction("ext-a", "CLOSED", null), attraction("ext-b", "OPERATING", 20)]);
		const summary = await livePoll();
		assert.equal(summary["changesRecorded"], 1);
	});

	it("reports a failing park instead of throwing", async () => {
		(themeparks as { live: (id: string) => Promise<EntityLiveDataResponse> }).live = () =>
			Promise.reject(new Error("upstream exploded"));

		const summary = await livePoll();
		assert.equal(summary["failureCount"], 1);
		assert.match(JSON.stringify(summary["failures"]), /upstream exploded/);
	});
});

describe("advisory lock", () => {
	it("refuses a second holder while the first is running", async () => {
		let innerRan = false;
		const outer = await withAdvisoryLock("test:lock", async () => {
			const inner = await withAdvisoryLock("test:lock", () => {
				innerRan = true;
				return Promise.resolve("inner");
			});
			assert.equal(inner.ran, false, "second holder must be refused");
			return "outer";
		});

		assert.equal(outer.ran, true);
		assert.equal(outer.result, "outer");
		assert.equal(innerRan, false);
	});

	it("releases the lock so a later run can take it", async () => {
		const again = await withAdvisoryLock("test:lock", () => Promise.resolve("ok"));
		assert.equal(again.ran, true);
	});
});
