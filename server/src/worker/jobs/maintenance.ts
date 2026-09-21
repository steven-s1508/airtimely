import { sql } from "../../db/index.js";
import type { JobSummary } from "../../lib/jobRuns.js";

/**
 * Partitions to keep behind today. Raw changes are deleted when their park-day is
 * finalised (D-1..D-3), so this only reclaims partitions finalisation already emptied
 * — or ones it never managed to, which is a failure worth keeping the evidence of.
 */
const RETAIN_DAYS = 5;

/**
 * Makes sure the partitions the poller needs exist. Called nightly and at worker
 * startup; `create_ride_changes_partition` is idempotent.
 *
 * There is no default partition by design, so a missing one makes inserts fail loudly
 * rather than piling into a catch-all nobody drops. That makes this job self-checking:
 * if it stops running, the poller starts failing and the dead-man ping goes quiet.
 */
export async function ensurePartitions(daysAhead = 2): Promise<string[]> {
	const created: string[] = [];
	for (let offset = 0; offset <= daysAhead; offset++) {
		const [row] = await sql<{ create_ride_changes_partition: string }[]>`
			select create_ride_changes_partition(
				((now() at time zone 'UTC')::date + ${offset}::int)
			)
		`;
		if (row) created.push(row.create_ride_changes_partition);
	}
	return created;
}

export async function maintenance(): Promise<JobSummary> {
	const partitions = await ensurePartitions();

	const dropped = await sql<{ drop_ride_changes_partitions_before: string }[]>`
		select drop_ride_changes_partitions_before(
			((now() at time zone 'UTC')::date - ${RETAIN_DAYS}::int)
		)
	`;

	await sql`analyze ride_stats_hourly, ride_stats_daily, ride_live`;

	return {
		partitions,
		dropped: dropped.map((d) => d.drop_ride_changes_partitions_before),
		analyzed: true,
	};
}
