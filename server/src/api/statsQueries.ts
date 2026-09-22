import { sql } from "../db/index.js";

/**
 * Historical aggregates for the ride screen.
 *
 * All of this ran on the device in v1: the app pulled every historical row of a ride
 * to the phone and averaged them there, which was slow, wrong at the edges, and
 * silently truncated by PostgREST's max_rows.
 *
 * Every mean below is minute-weighted — sum(wait_sum) / sum(wait_minutes) — never an
 * average of averages, which would weight a ten-minute hour the same as a full one.
 */

export type RideStats = {
	/** Mean wait by hour of day, 0..23. Null where the ride never operated then. */
	hourOfDay: (number | null)[];
	/** Mean single-rider wait by hour of day. Null where the ride has no single-rider line. */
	hourOfDaySingle: (number | null)[];
	/** Mean wait by weekday, 0 = Sunday, matching JS getDay(). */
	weekday: (number | null)[];
	/** Mean single-rider wait by weekday, 0 = Sunday. */
	weekdaySingle: (number | null)[];
	/** Mean wait by calendar month, 0 = January. */
	monthly: (number | null)[];
	percentiles: { p25: number | null; p50: number | null; p90: number | null } | null;
	coverage: { firstDay: string | null; lastDay: string | null; days: number };
	/** Years with data, newest first, for the by-year chart. */
	years: number[];
};

function emptySlots(n: number): (number | null)[] {
	return Array.from({ length: n }, () => null);
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function toSlots(rows: { slot: number; mean: string | null }[], n: number): (number | null)[] {
	const slots = emptySlots(n);
	for (const row of rows) {
		if (row.mean !== null && row.slot >= 0 && row.slot < n) slots[row.slot] = round2(Number(row.mean));
	}
	return slots;
}

/**
 * Single-rider means come from the hourly table: `single_mean` is the only single-rider
 * figure kept. Each hour's mean is weighted by its operating minutes — the closest
 * stand-in for how long that mean was on display.
 */
const SINGLE_MEAN = sql`
	case when sum(h.operating_min) filter (where h.single_mean is not null) > 0
		then sum(h.single_mean * h.operating_min) filter (where h.single_mean is not null)
			/ sum(h.operating_min) filter (where h.single_mean is not null)
	end
`;

/**
 * Sums the daily wait_dist maps over a period and reads percentiles off the total.
 *
 * This is why wait_dist exists: percentiles cannot be averaged, so a p90 over a year
 * has to come from the combined distribution rather than from 365 daily p90s.
 */
async function percentilesOver(
	rideId: string,
	year: number | null,
): Promise<{ p25: number | null; p50: number | null; p90: number | null } | null> {
	const [row] = await sql<{ p25: string | null; p50: string | null; p90: string | null }[]>`
		with combined as (
			select key as wait_value, sum(value::numeric) as minutes
			from ride_stats_daily d, jsonb_each_text(d.wait_dist)
			where d.ride_id = ${rideId}::uuid
				and d.wait_dist is not null
				${year === null ? sql`` : sql`and extract(year from d.local_date) = ${year}`}
			group by key
		),
		total as (select jsonb_object_agg(wait_value, minutes) as dist from combined)
		select
			wait_dist_percentile(dist, 0.25) as p25,
			wait_dist_percentile(dist, 0.50) as p50,
			wait_dist_percentile(dist, 0.90) as p90
		from total
	`;
	if (!row || (row.p25 === null && row.p50 === null && row.p90 === null)) return null;
	return {
		p25: row.p25 === null ? null : Number(row.p25),
		p50: row.p50 === null ? null : Number(row.p50),
		p90: row.p90 === null ? null : Number(row.p90),
	};
}

export async function getRideStats(rideId: string, year: number | null = null): Promise<RideStats> {
	const yearFilterHourly = year === null ? sql`` : sql`and extract(year from h.local_date) = ${year}`;
	const yearFilterDaily = year === null ? sql`` : sql`and extract(year from d.local_date) = ${year}`;

	const [
		hourRows,
		hourSingleRows,
		weekdayRows,
		weekdaySingleRows,
		monthRows,
		coverageRows,
		yearRows,
		percentiles,
	] = await Promise.all([
		sql<{ slot: number; mean: string | null }[]>`
			select
				h.local_hour as slot,
				case when sum(h.wait_minutes) > 0
					then sum(h.wait_sum)::numeric / sum(h.wait_minutes)
				end as mean
			from ride_stats_hourly h
			where h.ride_id = ${rideId}::uuid ${yearFilterHourly}
			group by h.local_hour
		`,
		sql<{ slot: number; mean: string | null }[]>`
			select h.local_hour as slot, ${SINGLE_MEAN} as mean
			from ride_stats_hourly h
			where h.ride_id = ${rideId}::uuid ${yearFilterHourly}
			group by h.local_hour
		`,
		sql<{ slot: number; mean: string | null }[]>`
			select
				extract(dow from d.local_date)::int as slot,
				case when sum(d.wait_minutes) > 0
					then sum(d.wait_sum)::numeric / sum(d.wait_minutes)
				end as mean
			from ride_stats_daily d
			where d.ride_id = ${rideId}::uuid ${yearFilterDaily}
			group by 1
		`,
		sql<{ slot: number; mean: string | null }[]>`
			select extract(dow from h.local_date)::int as slot, ${SINGLE_MEAN} as mean
			from ride_stats_hourly h
			where h.ride_id = ${rideId}::uuid ${yearFilterHourly}
			group by 1
		`,
		sql<{ slot: number; mean: string | null }[]>`
			select
				(extract(month from d.local_date)::int - 1) as slot,
				case when sum(d.wait_minutes) > 0
					then sum(d.wait_sum)::numeric / sum(d.wait_minutes)
				end as mean
			from ride_stats_daily d
			where d.ride_id = ${rideId}::uuid ${yearFilterDaily}
			group by 1
		`,
		sql<{ first_day: string | null; last_day: string | null; days: number }[]>`
			select
				min(d.local_date)::text as first_day,
				max(d.local_date)::text as last_day,
				count(*)::int as days
			from ride_stats_daily d
			where d.ride_id = ${rideId}::uuid ${yearFilterDaily}
		`,
		sql<{ year: number }[]>`
			select distinct extract(year from d.local_date)::int as year
			from ride_stats_daily d
			where d.ride_id = ${rideId}::uuid
			order by year desc
		`,
		percentilesOver(rideId, year),
	]);

	const coverage = coverageRows[0];
	return {
		hourOfDay: toSlots(hourRows, 24),
		hourOfDaySingle: toSlots(hourSingleRows, 24),
		weekday: toSlots(weekdayRows, 7),
		weekdaySingle: toSlots(weekdaySingleRows, 7),
		monthly: toSlots(monthRows, 12),
		percentiles,
		coverage: {
			firstDay: coverage?.first_day ?? null,
			lastDay: coverage?.last_day ?? null,
			days: coverage?.days ?? 0,
		},
		years: yearRows.map((r) => r.year),
	};
}

export type RideDay = {
	localDate: string;
	hours: {
		localHour: number;
		mean: number | null;
		min: number | null;
		max: number | null;
		operatingMin: number | null;
	}[];
	summary: {
		mean: number | null;
		min: number | null;
		max: number | null;
		operatingMin: number | null;
		scheduledMin: number | null;
		downMin: number | null;
		p50: number | null;
		p90: number | null;
		peakHour: number | null;
		quietestHour: number | null;
	} | null;
};

/**
 * One past day's wait curve — the chart the hourly table makes possible.
 *
 * Buckets are ordered by instant, so on the autumn DST change the repeated local hour
 * appears twice, in the order it actually happened.
 */
export async function getRideDay(rideId: string, localDate: string): Promise<RideDay> {
	const [hours, summaryRows] = await Promise.all([
		sql<
			{
				local_hour: number;
				mean: string | null;
				min: number | null;
				max: number | null;
				operating_min: number | null;
			}[]
		>`
			select
				h.local_hour,
				case when h.wait_minutes > 0 then h.wait_sum::numeric / h.wait_minutes end as mean,
				h.wait_min as min,
				h.wait_max as max,
				h.operating_min
			from ride_stats_hourly h
			where h.ride_id = ${rideId}::uuid and h.local_date = ${localDate}::date
			order by h.bucket_start
		`,
		sql<
			{
				mean: string | null;
				min: number | null;
				max: number | null;
				operating_min: number | null;
				scheduled_min: number | null;
				down_min: number | null;
				p50: string | null;
				p90: string | null;
				peak_hour: number | null;
				quietest_hour: number | null;
			}[]
		>`
			select
				case when d.wait_minutes > 0 then d.wait_sum::numeric / d.wait_minutes end as mean,
				d.wait_min as min, d.wait_max as max,
				d.operating_min, d.scheduled_min, d.down_min,
				d.p50, d.p90, d.peak_hour, d.quietest_hour
			from ride_stats_daily d
			where d.ride_id = ${rideId}::uuid and d.local_date = ${localDate}::date
		`,
	]);

	const summary = summaryRows[0];
	return {
		localDate,
		hours: hours.map((h) => ({
			localHour: h.local_hour,
			mean: h.mean === null ? null : round2(Number(h.mean)),
			min: h.min,
			max: h.max,
			operatingMin: h.operating_min,
		})),
		summary: summary
			? {
					mean: summary.mean === null ? null : round2(Number(summary.mean)),
					min: summary.min,
					max: summary.max,
					operatingMin: summary.operating_min,
					scheduledMin: summary.scheduled_min,
					downMin: summary.down_min,
					p50: summary.p50 === null ? null : Number(summary.p50),
					p90: summary.p90 === null ? null : Number(summary.p90),
					peakHour: summary.peak_hour,
					quietestHour: summary.quietest_hour,
				}
			: null,
	};
}

export type RideMonth = {
	month: string;
	/** Mean wait for each day of the month, index 0 = the 1st. Null where nothing operated. */
	daily: (number | null)[];
	/** Mean single-rider wait for each day of the month. */
	dailySingle: (number | null)[];
};

/**
 * Daily means across one calendar month, for the ride screen's month chart.
 *
 * Only finalised days appear: today is still in the change log, and has its own
 * curve on `/v1/rides/:id`.
 */
export async function getRideMonth(rideId: string, month: string): Promise<RideMonth> {
	const first = `${month}-01`;
	const [year, monthNumber] = month.split("-").map(Number) as [number, number];
	const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

	const [dailyRows, singleRows] = await Promise.all([
		sql<{ slot: number; mean: string | null }[]>`
			select
				(extract(day from d.local_date)::int - 1) as slot,
				case when d.wait_minutes > 0 then d.wait_sum::numeric / d.wait_minutes end as mean
			from ride_stats_daily d
			where d.ride_id = ${rideId}::uuid
				and d.local_date >= ${first}::date
				and d.local_date < (${first}::date + interval '1 month')
		`,
		sql<{ slot: number; mean: string | null }[]>`
			select (extract(day from h.local_date)::int - 1) as slot, ${SINGLE_MEAN} as mean
			from ride_stats_hourly h
			where h.ride_id = ${rideId}::uuid
				and h.local_date >= ${first}::date
				and h.local_date < (${first}::date + interval '1 month')
			group by h.local_date
		`,
	]);

	return {
		month,
		daily: toSlots(dailyRows, daysInMonth),
		dailySingle: toSlots(singleRows, daysInMonth),
	};
}
