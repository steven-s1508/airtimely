import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ChangeState } from "../src/lib/stats/bucketize.ts";
import { bucketize } from "../src/lib/stats/bucketize.ts";

const at = (iso: string) => Date.parse(iso);

function state(iso: string, status: string | null, wait?: number | null, single?: number | null): ChangeState {
	return { t: at(iso), status, wait, single };
}

describe("bucketize", () => {
	it("holds each state until the next change, weighted by duration", () => {
		// 10:00-10:15 at 10, then 10:15-11:00 at 30. Mean must be 25, not 20:
		// weighting by duration, not by sample count.
		const { buckets } = bucketize(
			[
				state("2026-06-15T10:00:00Z", "OPERATING", 10),
				state("2026-06-15T10:15:00Z", "OPERATING", 30),
				state("2026-06-15T11:00:00Z", "CLOSED", null),
			],
			"2026-06-15",
			"UTC",
		);

		const ten = buckets.find((b) => b.localHour === 10)!;
		assert.equal(ten.waitMinutes, 60);
		assert.equal(ten.waitSum, 10 * 15 + 30 * 45);
		assert.equal(ten.waitSum / ten.waitMinutes, 25);
		assert.equal(ten.waitMin, 10);
		assert.equal(ten.waitMax, 30);
	});

	it("ignores a wait displayed while DOWN", () => {
		// Rides keep showing their last wait after breaking down. Counting it is the
		// bug patch _05 fixed; the port must not reintroduce it.
		const { buckets, waitDist } = bucketize(
			[
				state("2026-06-15T10:00:00Z", "OPERATING", 20),
				state("2026-06-15T10:30:00Z", "DOWN", 45),
				state("2026-06-15T11:00:00Z", "CLOSED", null),
			],
			"2026-06-15",
			"UTC",
		);

		const ten = buckets.find((b) => b.localHour === 10)!;
		assert.equal(ten.operatingMin, 30);
		assert.equal(ten.downMin, 30);
		assert.equal(ten.waitMinutes, 30, "only the OPERATING half carries a wait");
		assert.equal(ten.waitSum, 20 * 30);
		assert.equal(ten.waitMax, 20, "45 was displayed while DOWN and must not count");
		assert.equal(waitDist["45"], undefined);
		assert.equal(waitDist["20"], 30);
	});

	it("keeps the repeated local hour as two buckets on the autumn DST change", () => {
		// Europe/Berlin, 2026-10-25: local 02:00 happens twice. v1 keyed buckets by the
		// local hour number and merged them, losing an hour.
		const { buckets } = bucketize(
			[
				state("2026-10-25T00:00:00Z", "OPERATING", 30), // 02:00 CEST
				state("2026-10-25T01:00:00Z", "OPERATING", 50), // 02:00 CET
				state("2026-10-25T02:00:00Z", "CLOSED", null), // 03:00 CET
			],
			"2026-10-25",
			"Europe/Berlin",
		);

		const twos = buckets.filter((b) => b.localHour === 2);
		assert.equal(twos.length, 2, "both 02:00 hours must survive");
		assert.equal(twos[0]!.waitSum / twos[0]!.waitMinutes, 30);
		assert.equal(twos[1]!.waitSum / twos[1]!.waitMinutes, 50);
		assert.notEqual(twos[0]!.bucketStart.getTime(), twos[1]!.bucketStart.getTime());
		assert.equal(twos[0]!.localDate, "2026-10-25");
	});

	it("clips to the park-local day at both ends", () => {
		// America/New_York: the local day starts at 04:00Z. A state opened the previous
		// evening must contribute only from local midnight.
		const { buckets } = bucketize(
			[
				state("2026-06-14T20:00:00Z", "OPERATING", 15),
				state("2026-06-16T10:00:00Z", "CLOSED", null),
			],
			"2026-06-15",
			"America/New_York",
		);

		const total = buckets.reduce((sum, b) => sum + b.operatingMin, 0);
		assert.equal(total, 24 * 60, "exactly one local day of coverage");
		assert.equal(buckets[0]!.localHour, 0);
		assert.equal(buckets.at(-1)!.localHour, 23);
		assert.ok(buckets.every((b) => b.localDate === "2026-06-15"));
	});

	it("builds a wait distribution in minutes, not sample counts", () => {
		const { waitDist } = bucketize(
			[
				state("2026-06-15T10:00:00Z", "OPERATING", 5),
				state("2026-06-15T10:20:00Z", "OPERATING", 30),
				state("2026-06-15T11:40:00Z", "OPERATING", 5),
				state("2026-06-15T12:00:00Z", "CLOSED", null),
			],
			"2026-06-15",
			"UTC",
		);

		// 5 for 20 min then again for 20 min; 30 for 80 min.
		assert.deepEqual(waitDist, { "5": 40, "30": 80 });
	});

	it("separates DOWN from CLOSED so uptime is not inferred from absence", () => {
		const { buckets } = bucketize(
			[
				state("2026-06-15T09:00:00Z", "CLOSED", null),
				state("2026-06-15T10:00:00Z", "OPERATING", 10),
				state("2026-06-15T10:30:00Z", "DOWN", null),
				state("2026-06-15T11:00:00Z", "REFURBISHMENT", null),
				state("2026-06-15T12:00:00Z", "CLOSED", null),
			],
			"2026-06-15",
			"UTC",
		);

		const nine = buckets.find((b) => b.localHour === 9)!;
		const ten = buckets.find((b) => b.localHour === 10)!;
		const eleven = buckets.find((b) => b.localHour === 11)!;

		assert.equal(nine.closedMin, 60);
		assert.equal(ten.operatingMin, 30);
		assert.equal(ten.downMin, 30);
		// REFURBISHMENT counts as closed, not as downtime.
		assert.equal(eleven.closedMin, 60);
		assert.equal(eleven.downMin, 0);
	});

	it("handles an empty change log without inventing coverage", () => {
		const { buckets, waitDist } = bucketize([], "2026-06-15", "UTC");
		assert.deepEqual(buckets, []);
		assert.deepEqual(waitDist, {});
	});

	it("is order-independent", () => {
		const rows = [
			state("2026-06-15T11:00:00Z", "OPERATING", 40),
			state("2026-06-15T10:00:00Z", "OPERATING", 20),
			state("2026-06-15T12:00:00Z", "CLOSED", null),
		];
		const forward = bucketize(rows, "2026-06-15", "UTC");
		const reversed = bucketize([...rows].reverse(), "2026-06-15", "UTC");
		assert.deepEqual(reversed.waitDist, forward.waitDist);
		assert.deepEqual(
			reversed.buckets.map((b) => b.waitSum),
			forward.buckets.map((b) => b.waitSum),
		);
	});
});
