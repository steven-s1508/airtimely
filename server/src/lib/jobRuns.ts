import { sql } from "../db/index.js";
import { env } from "../env.js";
import { withAdvisoryLock } from "./locks.js";

/** JSON-serialisable values, matching what the `summary` jsonb column can hold. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JobSummary = Record<string, JsonValue>;

/**
 * Runs a job under its advisory lock and records the attempt in `job_runs`.
 *
 * Every run opens a row on entry and closes it with ok/summary/error whatever
 * happens, including a throw. The absence of exactly this bookkeeping is what let a
 * Windmill crash go unnoticed from 2026-09-14 to 09-18.
 *
 * A job that could not take its lock records nothing: it did no work, and a row per
 * skipped tick would bury the real history.
 */
export async function runJob(
	name: string,
	fn: () => Promise<JobSummary>,
): Promise<JobSummary | null> {
	const outcome = await withAdvisoryLock(`job:${name}`, async () => {
		const [run] = await sql<{ id: string }[]>`
			insert into job_runs (job) values (${name}) returning id
		`;
		const id = run!.id;
		const startedAt = Date.now();

		try {
			const summary = await fn();
			await sql`
				update job_runs
				set finished_at = now(), ok = true, summary = ${sql.json(summary)}
				where id = ${id}
			`;
			console.log(`[job:${name}] ok in ${Date.now() - startedAt}ms`, summary);
			return summary;
		} catch (error) {
			const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
			await sql`
				update job_runs
				set finished_at = now(), ok = false, error = ${message}
				where id = ${id}
			`;
			console.error(`[job:${name}] FAILED after ${Date.now() - startedAt}ms`, message);
			// Swallowed deliberately: one failing job must not take the worker down.
			// The failure is visible in job_runs and, for the poller, via the dead-man ping.
			return null;
		}
	});

	if (!outcome.ran) {
		console.warn(`[job:${name}] skipped; lock held by another run`);
		return null;
	}
	return outcome.result;
}

/**
 * Dead-man ping. Only fires on success, so a job that starts failing stops the pings
 * and the monitor raises the alarm. Never throws: a monitoring outage is not a
 * pipeline outage.
 */
export async function pingDeadMan(): Promise<void> {
	if (!env.healthcheckPingUrl) return;
	try {
		await fetch(env.healthcheckPingUrl, { signal: AbortSignal.timeout(10_000) });
	} catch (error) {
		console.warn("[health] dead-man ping failed", error instanceof Error ? error.message : error);
	}
}
