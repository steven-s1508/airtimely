/**
 * Backfill after a worker outage.
 *
 *   node dist/cli/backfill.js --from 2026-10-05 [--to 2026-10-16] [--dry-run] [--skip-schedules]
 *
 * Run it in the worker container, which already has DATABASE_URL and the API key.
 *
 * Why the nightly job does not recover on its own: `finalise_day` picks up the last
 * three days plus park-days that already have an unfinalised `park_day_ingest` row. A
 * day the worker never touched has no row, so once it is older than three days it is
 * never selected and never fetched, and after 30 days the history API no longer has it.
 *
 * What this does, for every active park and every park-local date in the range:
 *  1. Re-reads the schedule for those dates from the month endpoint, so uptime is
 *     measured against the hours the park actually kept.
 *  2. Finalises each park-day that is not finalised yet, from the history API only.
 *     The own-changes fallback is off: with the poller down, the last state before
 *     the crash would otherwise stand in for whole days.
 *
 * Safe to re-run: finalised days are skipped, so an interrupted run just continues.
 * It waits out the hourly history budget instead of stopping.
 */
import { parseArgs } from "node:util";

import { DateTime } from "luxon";

import { sql } from "../db/index.js";
import { ChangeSource } from "../db/schema/enums.js";
import { runJob } from "../lib/jobRuns.js";
import { withAdvisoryLock } from "../lib/locks.js";
import type { ScheduleEntry } from "../lib/themeparks.js";
import { HistoryBudgetExhausted, themeparks } from "../lib/themeparks.js";
import type { Candidate } from "../worker/jobs/finaliseDay.js";
import { finaliseParkDay, recordFailure } from "../worker/jobs/finaliseDay.js";
import { replaceSchedule, scheduleRows } from "../worker/jobs/scheduleSync.js";

/** How far back the history API reaches with the free key. */
const HISTORY_WINDOW_DAYS = 30;
/** Leave room for the worker's own history calls. */
const BUDGET_RESERVE = 40;
const BUDGET_WAIT_MS = 5 * 60_000;
/** A gap between successful polls longer than this counts as an outage. */
const POLL_GAP = "30 minutes";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRange(): { from: string; to: string; dryRun: boolean; skipSchedules: boolean } {
	const { values } = parseArgs({
		options: {
			from: { type: "string" },
			to: { type: "string" },
			"dry-run": { type: "boolean", default: false },
			"skip-schedules": { type: "boolean", default: false },
		},
	});

	const todayUtc = DateTime.utc().startOf("day");
	const from = values.from;
	const to = values.to ?? todayUtc.minus({ days: 1 }).toISODate()!;

	if (!from || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
		throw new Error("Usage: backfill --from YYYY-MM-DD [--to YYYY-MM-DD] [--dry-run] [--skip-schedules]");
	}
	if (from > to) throw new Error(`--from ${from} is after --to ${to}`);

	const oldest = todayUtc.minus({ days: HISTORY_WINDOW_DAYS }).toISODate()!;
	if (from < oldest) {
		throw new Error(
			`--from ${from} is outside the history API's ${HISTORY_WINDOW_DAYS}-day window (oldest: ${oldest}); those days cannot be recovered`,
		);
	}

	return { from, to, dryRun: values["dry-run"], skipSchedules: values["skip-schedules"] };
}

/** Prints gaps in successful live polls, so the range can be checked against the outage. */
async function reportPollerGaps(from: string): Promise<void> {
	const gaps = await sql<{ gap_from: Date; gap_to: Date | null }[]>`
		with polls as (
			select started_at
			from job_runs
			where job = 'live_poll' and ok and started_at >= ${from}::date - 1
		),
		ordered as (
			select lag(started_at) over (order by started_at) as gap_from, started_at as gap_to
			from polls
		)
		select gap_from, gap_to from ordered
		where gap_to - gap_from > ${POLL_GAP}::interval
		union all
		-- Still down now?
		select max(started_at), null::timestamptz from polls
		having coalesce(max(started_at), '-infinity') < now() - ${POLL_GAP}::interval
		order by 1
	`;

	if (gaps.length === 0) {
		console.log(`[backfill] no live_poll gaps longer than ${POLL_GAP} since ${from}`);
		return;
	}
	for (const gap of gaps) {
		if (gap.gap_to) {
			console.log(`[backfill] poller gap: ${gap.gap_from.toISOString()} → ${gap.gap_to.toISOString()}`);
		} else {
			console.warn(
				`[backfill] WARNING: no successful live_poll since ${gap.gap_from?.toISOString() ?? "ever"}. ` +
					"Restart the worker first, or days after this run will be missed again.",
			);
		}
	}
}

async function backfillSchedules(from: string, to: string, dryRun: boolean): Promise<void> {
	const parks = await sql<{ id: string; external_id: string; name: string }[]>`
		select id, external_id, name from parks
		where is_active and external_id is not null
		order by name
	`;

	const months: { year: number; month: number }[] = [];
	for (
		let cursor = DateTime.fromISO(from).startOf("month");
		cursor <= DateTime.fromISO(to);
		cursor = cursor.plus({ months: 1 })
	) {
		months.push({ year: cursor.year, month: cursor.month });
	}

	let written = 0;
	const unknownTypes = new Map<string, number>();
	const normalisedTypes = new Map<string, number>();
	const failures: string[] = [];

	for (const park of parks) {
		try {
			const entries: ScheduleEntry[] = [];
			for (const { year, month } of months) {
				const response = await themeparks.scheduleMonth(park.external_id, year, month);
				// Only the backfill range: dates outside it are the regular sync's business.
				entries.push(...(response.schedule ?? []).filter((e) => e.date >= from && e.date <= to));
			}
			const rows = scheduleRows(park.id, entries, unknownTypes, normalisedTypes);
			written += dryRun ? rows.length : await replaceSchedule(park.id, rows);
		} catch (error) {
			failures.push(`${park.name}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	console.log(`[backfill] schedules: ${written} entries ${dryRun ? "would be written" : "written"} for ${parks.length} parks`);
	if (unknownTypes.size > 0) console.log("[backfill] unknown schedule types skipped:", Object.fromEntries(unknownTypes));
	for (const failure of failures) console.warn(`[backfill] schedule failed: ${failure}`);
}

/** Every unfinalised park-day in the range that is over in the park's own timezone. */
async function selectCandidates(from: string, to: string): Promise<Candidate[]> {
	return sql<Candidate[]>`
		select
			p.id as park_id,
			p.external_id,
			coalesce(p.timezone, 'UTC') as timezone,
			d::date::text as local_date,
			coalesce(i.attempts, 0) as attempts
		from parks p
		cross join generate_series(${from}::date, ${to}::date, interval '1 day') as d
		left join park_day_ingest i on i.park_id = p.id and i.local_date = d::date
		where p.is_active and p.external_id is not null
			and i.finalised_at is null
			and d::date < (now() at time zone coalesce(p.timezone, 'UTC'))::date
		order by d, p.name
	`;
}

async function finaliseAll(candidates: Candidate[]) {
	let processed = 0;
	let ridesWritten = 0;
	let noHistory = 0;
	const unknownAttractions = new Set<string>();
	const failures: string[] = [];

	for (const [index, candidate] of candidates.entries()) {
		for (;;) {
			while (themeparks.historyRemaining() <= BUDGET_RESERVE) {
				console.log(`[backfill] history budget low, waiting ${BUDGET_WAIT_MS / 60_000} min`);
				await sleep(BUDGET_WAIT_MS);
			}
			try {
				const result = await finaliseParkDay(candidate, { ownChangesFallback: false });
				processed++;
				ridesWritten += result.ridesWritten;
				if (result.source === ChangeSource.POLLER) noHistory++;
				for (const name of result.unknownAttractions) unknownAttractions.add(name);
				break;
			} catch (error) {
				// The server can disagree with our own count; wait and retry the same day.
				if (error instanceof HistoryBudgetExhausted) {
					await sleep(BUDGET_WAIT_MS);
					continue;
				}
				await recordFailure(candidate, error);
				failures.push(
					`${candidate.external_id} ${candidate.local_date}: ${error instanceof Error ? error.message : String(error)}`,
				);
				break;
			}
		}
		if ((index + 1) % 25 === 0) console.log(`[backfill] ${index + 1}/${candidates.length} park-days done`);
	}

	return {
		candidates: candidates.length,
		processed,
		ridesWritten,
		parkDaysWithoutHistory: noHistory,
		unknownAttractions: [...unknownAttractions].slice(0, 25),
		failureCount: failures.length,
		failures: failures.slice(0, 20),
	};
}

async function main(): Promise<void> {
	const { from, to, dryRun, skipSchedules } = parseRange();
	console.log(`[backfill] range ${from} … ${to}${dryRun ? " (dry run)" : ""}`);

	await reportPollerGaps(from);

	// Schedules first: the daily rollup measures uptime against them.
	if (!skipSchedules) await backfillSchedules(from, to, dryRun);

	const candidates = await selectCandidates(from, to);
	console.log(`[backfill] ${candidates.length} park-days to finalise`);
	if (dryRun || candidates.length === 0) return;

	// Same lock as the nightly job, so the two never write the same park-day at once.
	// While this runs, the nightly finalise_day skips; the range covers its days.
	const outcome = await withAdvisoryLock("job:finalise_day", () =>
		runJob("backfill", () => finaliseAll(candidates)),
	);
	if (!outcome.ran) {
		throw new Error("finalise_day is running right now; try again once it has finished");
	}
	if (!outcome.result) throw new Error("backfill failed; see job_runs for the error");
}

try {
	await main();
} catch (error) {
	console.error(`[backfill] ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
