import { sql } from "../../db/index.js";
import type { JobSummary } from "../../lib/jobRuns.js";
import { HistoryBudgetExhausted, themeparks } from "../../lib/themeparks.js";

/** How far back to compare. One page of history/daily holds 31 days. */
const WINDOW_DAYS = 7;

/**
 * Tolerances. Not "close enough to ignore" — each is the width of a genuine modelling
 * difference, set from measurement rather than guessed.
 *
 * Measured over 283 ride-days at Magic Kingdom, Europa-Park and Tokyo Disneyland
 * (2026-09-17..19), comparing our hourly sums against the API's own figures:
 *
 *   operatingMinutes  mean |d| 0.51  median 0  max 2    (segment boundary rounding)
 *   downMinutes       mean |d| 0.05  median 0  max 1
 *   mean wait         mean |d| 0.19  median 0.17  max 0.5
 *   p50               exact on all 267
 *   p90               exact on 266/267, one case off by 5
 *
 * The mean's half-minute spread is the API reporting an integer against our two
 * decimals, so agreement there is as close as the comparison can express. Tolerances
 * sit a little above the observed maxima: tight enough that a real regression trips
 * them, loose enough that the other 195 parks do not cry wolf on day one.
 */
const OPERATING_TOLERANCE_MIN = 5;
const DOWN_TOLERANCE_MIN = 5;
const MEAN_TOLERANCE = 1;
const PERCENTILE_TOLERANCE = 5;

const BUDGET_RESERVE = 10;

type ParkRow = { id: string; external_id: string; name: string };

type Discrepancy = {
	park: string;
	ride: string;
	date: string;
	field: string;
	ours: number | null;
	theirs: number | null;
};

type OurRow = {
	external_id: string;
	local_date: string;
	operating_min: number | null;
	down_min: number | null;
	mean: string | null;
	p50: string | null;
	p90: string | null;
};

/**
 * Compares our finalised statistics against the API's own daily summaries.
 *
 * Deliberately compares against `ride_stats_hourly` summed over the day, NOT against
 * `ride_stats_daily`. The API's operatingMinutes covers the whole local day, while our
 * daily row is clipped to the park's opening hours — comparing those two would
 * manufacture a systematic difference at every park that runs a ride outside its
 * posted hours. The hourly sums are the like-for-like figure, which isolates
 * bucketize; the schedule clipping is covered by the parity fixtures instead.
 *
 * Percentiles come from `wait_dist`, which is also unclipped, so those compare
 * directly.
 *
 * Findings go to `job_runs`. Nothing is corrected automatically.
 */
export async function validate(): Promise<JobSummary> {
	const parks = await sql<ParkRow[]>`
		select id, external_id, name
		from parks
		where is_active and external_id is not null
		order by name
	`;

	const [range] = await sql<{ from_date: string; to_date: string }[]>`
		select
			((now() at time zone 'UTC')::date - ${WINDOW_DAYS}::int)::text as from_date,
			((now() at time zone 'UTC')::date - 1)::text as to_date
	`;
	const from = range!.from_date;
	const to = range!.to_date;

	const discrepancies: Discrepancy[] = [];
	const byField = new Map<string, number>();
	let parksCompared = 0;
	let rideDaysCompared = 0;
	let parksWithoutData = 0;
	let budgetStopped = false;
	const failures: string[] = [];

	for (const park of parks) {
		if (themeparks.historyRemaining() <= BUDGET_RESERVE) {
			budgetStopped = true;
			break;
		}

		let summary;
		try {
			summary = await themeparks.historyDaily(park.external_id, from, to);
		} catch (error) {
			if (error instanceof HistoryBudgetExhausted) {
				budgetStopped = true;
				break;
			}
			failures.push(`${park.name}: ${error instanceof Error ? error.message : String(error)}`);
			continue;
		}

		const entities = summary?.entities ?? [];
		if (entities.length === 0) {
			parksWithoutData++;
			continue;
		}
		parksCompared++;

		const ours = await sql<OurRow[]>`
			select
				r.external_id,
				h.local_date::text as local_date,
				sum(h.operating_min)::int as operating_min,
				sum(h.down_min)::int as down_min,
				case when sum(h.wait_minutes) > 0
					then round(sum(h.wait_sum)::numeric / sum(h.wait_minutes), 2)
				end as mean,
				max(d.p50) as p50,
				max(d.p90) as p90
			from ride_stats_hourly h
			join rides r on r.id = h.ride_id
			left join ride_stats_daily d
				on d.ride_id = h.ride_id and d.local_date = h.local_date
			where r.park_id = ${park.id}::uuid
				and h.local_date between ${from}::date and ${to}::date
				and r.external_id is not null
			group by r.external_id, h.local_date
		`;

		const oursByKey = new Map(ours.map((o) => [`${o.external_id}|${o.local_date}`, o]));

		for (const entity of entities) {
			for (const day of entity.days ?? []) {
				const mine = oursByKey.get(`${entity.id}|${day.date}`);
				if (!mine) continue;
				rideDaysCompared++;

				const compare = (
					field: string,
					ourValue: number | null,
					theirValue: number | null | undefined,
					tolerance: number,
				) => {
					if (ourValue === null || theirValue === null || theirValue === undefined) return;
					if (Math.abs(ourValue - theirValue) <= tolerance) return;
					discrepancies.push({
						park: park.name,
						ride: entity.name,
						date: day.date,
						field,
						ours: ourValue,
						theirs: theirValue,
					});
					byField.set(field, (byField.get(field) ?? 0) + 1);
				};

				compare("operatingMinutes", mine.operating_min, day.operatingMinutes, OPERATING_TOLERANCE_MIN);
				compare("downMinutes", mine.down_min, day.downMinutes, DOWN_TOLERANCE_MIN);
				compare(
					"mean",
					mine.mean === null ? null : Number(mine.mean),
					day.standby?.mean,
					MEAN_TOLERANCE,
				);
				compare(
					"p50",
					mine.p50 === null ? null : Number(mine.p50),
					day.standby?.p50,
					PERCENTILE_TOLERANCE,
				);
				compare(
					"p90",
					mine.p90 === null ? null : Number(mine.p90),
					day.standby?.p90,
					PERCENTILE_TOLERANCE,
				);
			}
		}
	}

	const byPark = new Map<string, number>();
	for (const d of discrepancies) byPark.set(d.park, (byPark.get(d.park) ?? 0) + 1);

	return {
		window: `${from}..${to}`,
		parksCompared,
		parksWithoutData,
		rideDaysCompared,
		discrepancyCount: discrepancies.length,
		discrepancyRate:
			rideDaysCompared > 0
				? Math.round((discrepancies.length / rideDaysCompared) * 10_000) / 100
				: 0,
		byField: Object.fromEntries(byField),
		worstParks: [...byPark.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([park, count]) => `${park}: ${count}`),
		samples: discrepancies.slice(0, 25).map((d) => JSON.stringify(d)),
		budgetStopped,
		historyRemaining: themeparks.historyRemaining(),
		failureCount: failures.length,
		failures: failures.slice(0, 10),
	};
}
