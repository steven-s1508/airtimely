import type { InferResponseType } from "hono/client";
import { DateTime } from "luxon";
import { api, readJson } from "./client";

const rides = api.v1.rides[":id"];

export type RidePayload = InferResponseType<(typeof rides)["$get"], 200>;
type StatsPayload = InferResponseType<(typeof rides)["stats"]["$get"], 200>;
type MonthPayload = InferResponseType<(typeof rides)["month"]["$get"], 200>;

/** One point on today's wait curve. `at` is a true instant; format it in `timezone`. */
export interface LiveWaitTimePoint {
	at: string;
	status: string;
	wait_time_minutes: number | null;
	single_rider_wait_time_minutes: number | null;
}

export interface LiveRideStatistics {
	ride: NonNullable<RidePayload>;
	waitTimeData: LiveWaitTimePoint[];
}

/** Resolution of the live curve — the poller's cadence. */
const SAMPLE_MS = 5 * 60 * 1000;

/**
 * Expands today's change log into a 5-minute series for the line chart.
 *
 * The server stores only transitions, so each state is carried forward until the next
 * one, up to the last poll. Waits count only while OPERATING, as in every statistic:
 * rides routinely keep displaying their last wait while DOWN or CLOSED.
 */
function sampleToday(ride: NonNullable<RidePayload>): LiveWaitTimePoint[] {
	const changes = ride.today;
	if (changes.length === 0) return [];

	const first = Date.parse(changes[0].at);
	const lastPoll = ride.live?.updatedAt ? Date.parse(ride.live.updatedAt) : Date.parse(changes[changes.length - 1].at);
	const end = Math.min(Math.max(lastPoll, first), Date.now());

	const points: LiveWaitTimePoint[] = [];
	let index = 0;
	for (let t = Math.floor(first / SAMPLE_MS) * SAMPLE_MS; t <= end; t += SAMPLE_MS) {
		while (index + 1 < changes.length && Date.parse(changes[index + 1].at) <= t) index++;
		const state = changes[index];
		if (Date.parse(state.at) > t) continue;

		const operating = state.status === "OPERATING";
		points.push({
			at: new Date(t).toISOString(),
			status: state.status ?? "Unknown",
			wait_time_minutes: operating ? state.waitMinutes : null,
			single_rider_wait_time_minutes: operating ? state.singleRiderMinutes : null,
		});
	}
	return points;
}

/** The ride, its live state and today's curve so far. */
export async function getLiveRideStatistics(rideId: string): Promise<LiveRideStatistics | null> {
	const ride = await readJson<RidePayload>(await rides.$get({ param: { id: rideId } }));
	if (!ride) return null;
	return { ride, waitTimeData: sampleToday(ride) };
}

function getRideStats(rideId: string, year?: number): Promise<StatsPayload> {
	return rides.stats
		.$get({ param: { id: rideId }, query: year === undefined ? {} : { year: String(year) } })
		.then((res) => readJson<StatsPayload>(res));
}

/** Charts draw a missing value as an empty bar. */
const orZero = (values: (number | null)[]) => values.map((v) => v ?? 0);

/** The server indexes weekdays from Sunday (JS getDay); the charts start on Monday. */
const mondayFirst = (values: (number | null)[]) => orZero([...values.slice(1), values[0] ?? null]);

/** Minute-weighted mean wait by hour of day, all time. */
export async function getAllTimeAverageHourlyWaitTimes(rideId: string): Promise<{ averageStandbyWaitTimes: number[]; averageSingleRiderWaitTimes: number[] }> {
	const stats = await getRideStats(rideId);
	return {
		averageStandbyWaitTimes: orZero(stats.hourOfDay),
		averageSingleRiderWaitTimes: orZero(stats.hourOfDaySingle),
	};
}

/** Minute-weighted mean wait by weekday, Monday first, all time. */
export async function getWeekdayAverageWaitTimes(rideId: string): Promise<{ weeklyAverageWaitTimes: number[]; weeklyAverageSingleWaitTimes: number[] }> {
	const stats = await getRideStats(rideId);
	return {
		weeklyAverageWaitTimes: mondayFirst(stats.weekday),
		weeklyAverageSingleWaitTimes: mondayFirst(stats.weekdaySingle),
	};
}

/** Minute-weighted mean wait by weekday, Monday first, within one calendar year. */
export async function getWeekdayAverageWaitTimesByYear(rideId: string, year: number): Promise<{ weeklyAverageWaitTimes: number[]; weeklyAverageSingleWaitTimes: number[] }> {
	const stats = await getRideStats(rideId, year);
	return {
		weeklyAverageWaitTimes: mondayFirst(stats.weekday),
		weeklyAverageSingleWaitTimes: mondayFirst(stats.weekdaySingle),
	};
}

/** Daily mean waits for each day of the current month; index 0 is the 1st. */
export async function getMonthlyAverageWaitTimes(rideId: string): Promise<{ monthlyAverageWaitTimes: number[]; monthlyAverageSingleWaitTimes: number[] }> {
	const month = DateTime.now().toFormat("yyyy-MM");
	const data = await readJson<MonthPayload>(await rides.month.$get({ param: { id: rideId }, query: { month } }));
	return {
		monthlyAverageWaitTimes: orZero(data.daily),
		monthlyAverageSingleWaitTimes: orZero(data.dailySingle),
	};
}
