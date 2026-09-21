import { DateTime } from "luxon";

import { RideStatus } from "../../db/schema/enums.js";

/** One state an entity held, valid until the next one. */
export type ChangeState = {
	/** Milliseconds since epoch — a true UTC instant. */
	t: number;
	status: string | null | undefined;
	wait: number | null | undefined;
	single: number | null | undefined;
};

export type HourBucket = {
	/** The instant the park-local hour begins. */
	bucketStart: Date;
	localDate: string;
	localHour: number;
	operatingMin: number;
	downMin: number;
	closedMin: number;
	waitMinutes: number;
	waitSum: number;
	waitMin: number | null;
	waitMax: number | null;
	singleMean: number | null;
};

export type BucketizeResult = {
	buckets: HourBucket[];
	/** Sparse map of displayed wait value to minutes displayed, across the whole day. */
	waitDist: Record<string, number>;
};

type Accumulator = {
	bucketStart: number;
	localDate: string;
	localHour: number;
	covered: number;
	operating: number;
	down: number;
	closed: number;
	waitSum: number;
	waitMinutes: number;
	waitMin: number | null;
	waitMax: number | null;
	singleSum: number;
	singleMinutes: number;
};

function emptyAccumulator(bucketStart: number, localDate: string, localHour: number): Accumulator {
	return {
		bucketStart,
		localDate,
		localHour,
		covered: 0,
		operating: 0,
		down: 0,
		closed: 0,
		waitSum: 0,
		waitMinutes: 0,
		waitMin: null,
		waitMax: null,
		singleSum: 0,
		singleMinutes: 0,
	};
}

/**
 * Turns one entity's change log for a park-local day into per-hour buckets plus the
 * day's wait distribution.
 *
 * Ported from `bucketizeEntity` in windmill/scheduled_functions/run_backfill_from_history.ts
 * with three changes:
 *
 *  1. Buckets are keyed by the hour's **instant**, not by the local hour number. On the
 *     autumn DST change the repeated local hour therefore stays two buckets; v1 merged
 *     them and lost an hour of data.
 *  2. DOWN and CLOSED minutes are tracked, so uptime no longer has to be inferred from
 *     what is missing.
 *  3. `waitDist` accumulates in the same pass, because percentiles cannot be averaged
 *     later and the raw change log is deleted once the day is finalised.
 *
 * Unchanged, and essential: each state holds until the next change, clipped to the
 * local day; weighting is by **duration**, not by sample count; and wait values are
 * counted only while OPERATING — rides routinely keep displaying their last wait while
 * DOWN or CLOSED, which is what made v1's pre-patch averages wrong.
 */
export function bucketize(
	states: ChangeState[],
	localDate: string,
	timezone: string,
): BucketizeResult {
	const dayStart = DateTime.fromISO(localDate, { zone: timezone }).startOf("day");
	const dayStartMs = dayStart.toMillis();
	const dayEndMs = dayStart.plus({ days: 1 }).toMillis();

	const ordered = [...states].sort((a, b) => a.t - b.t);
	const byBucket = new Map<number, Accumulator>();
	const waitDist: Record<string, number> = {};

	for (let i = 0; i < ordered.length; i++) {
		const state = ordered[i]!;
		const start = Math.max(state.t, dayStartMs);
		const end = Math.min(ordered[i + 1]?.t ?? dayEndMs, dayEndMs);
		if (end <= start) continue;

		let cursor = start;
		while (cursor < end) {
			const hourStart = DateTime.fromMillis(cursor, { zone: timezone }).startOf("hour");
			const hourStartMs = hourStart.toMillis();
			const segmentEnd = Math.min(end, hourStart.plus({ hours: 1 }).toMillis());
			const minutes = (segmentEnd - cursor) / 60_000;

			let acc = byBucket.get(hourStartMs);
			if (!acc) {
				acc = emptyAccumulator(hourStartMs, hourStart.toFormat("yyyy-MM-dd"), hourStart.hour);
				byBucket.set(hourStartMs, acc);
			}

			acc.covered += minutes;

			if (state.status === "OPERATING") {
				acc.operating += minutes;

				if (typeof state.wait === "number") {
					acc.waitSum += state.wait * minutes;
					acc.waitMinutes += minutes;
					acc.waitMin = acc.waitMin === null ? state.wait : Math.min(acc.waitMin, state.wait);
					acc.waitMax = acc.waitMax === null ? state.wait : Math.max(acc.waitMax, state.wait);

					const key = String(state.wait);
					waitDist[key] = (waitDist[key] ?? 0) + minutes;
				}

				if (typeof state.single === "number") {
					acc.singleSum += state.single * minutes;
					acc.singleMinutes += minutes;
				}
			} else if (state.status === "DOWN") {
				acc.down += minutes;
			} else if (state.status === "CLOSED" || state.status === "REFURBISHMENT") {
				acc.closed += minutes;
			}

			cursor = segmentEnd;
		}
	}

	const buckets: HourBucket[] = [...byBucket.values()]
		.filter((a) => a.covered > 0)
		.sort((a, b) => a.bucketStart - b.bucketStart)
		.map((a) => ({
			bucketStart: new Date(a.bucketStart),
			localDate: a.localDate,
			localHour: a.localHour,
			operatingMin: Math.round(a.operating),
			downMin: Math.round(a.down),
			closedMin: Math.round(a.closed),
			waitMinutes: Math.round(a.waitMinutes),
			waitSum: Math.round(a.waitSum),
			waitMin: a.waitMin,
			waitMax: a.waitMax,
			singleMean:
				a.singleMinutes > 0 ? Math.round((a.singleSum / a.singleMinutes) * 100) / 100 : null,
		}));

	// Round at the end so a long run of short segments cannot drift.
	for (const key of Object.keys(waitDist)) {
		waitDist[key] = Math.round(waitDist[key]!);
		if (waitDist[key] === 0) delete waitDist[key];
	}

	return { buckets, waitDist };
}

/** Maps an API status string onto the smallint code stored in `ride_changes`. */
export function statusCode(status: string | null | undefined): number | null {
	if (!status) return null;
	const code = RideStatus[status as keyof typeof RideStatus];
	return code ?? null;
}
