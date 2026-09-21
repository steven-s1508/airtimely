import { Cron } from "croner";

import { runJob } from "../lib/jobRuns.js";
import { entitySync } from "./jobs/entitySync.js";
import { finaliseDay } from "./jobs/finaliseDay.js";
import { livePoll } from "./jobs/livePoll.js";
import { ensurePartitions, maintenance } from "./jobs/maintenance.js";
import { parkSync } from "./jobs/parkSync.js";
import { scheduleSync } from "./jobs/scheduleSync.js";
import { validate } from "./jobs/validate.js";

/**
 * Job scheduler.
 *
 * Every job body goes through `runJob`, which takes a Postgres advisory lock and
 * records the attempt in `job_runs`. The lock is what makes a slow run unable to
 * overlap its own next tick or a second worker container, so `protect` here is only
 * a cheap in-process shortcut.
 *
 * Schedules are UTC. v1 ran on Europe/Berlin, which meant every job's relationship to
 * a park-local day shifted twice a year.
 */
const jobs: Cron[] = [];

function schedule(name: string, pattern: string, fn: () => Promise<unknown>): void {
	jobs.push(
		new Cron(pattern, { name, timezone: "UTC", protect: true }, () => {
			void fn();
		}),
	);
}

export function startWorker(): void {
	// Partitions first: the poller cannot write without today's.
	void ensurePartitions()
		.then((created) => console.log("[worker] partitions ready:", created.join(", ")))
		.catch((error: unknown) => console.error("[worker] partition bootstrap failed", error));

	schedule("live_poll", "*/5 * * * *", () => runJob("live_poll", livePoll));
	// Finalisation runs late enough that every park-local day D-1 is over, including
	// the westernmost. Validation follows once its results exist; maintenance drops
	// the partitions finalisation has emptied, so it goes last.
	schedule("finalise_day", "20 1 * * *", () => runJob("finalise_day", finaliseDay));
	schedule("validate", "10 2 * * *", () => runJob("validate", validate));
	schedule("maintenance", "40 2 * * *", () => runJob("maintenance", maintenance));

	// Schedules move often enough to be worth re-reading through the day.
	schedule("schedule_sync", "15 2,8,12,16,18,22 * * *", () => runJob("schedule_sync", scheduleSync));

	// Park sync and entity sync are ONE job, in order. v1 ran them as two Windmill
	// jobs both at Monday 00:00, so a newly added park could be synced for rides
	// before the park row existed.
	schedule("metadata_sync", "0 3 * * 1", () =>
		runJob("metadata_sync", async () => {
			const parks = await parkSync();
			const entities = await entitySync();
			return { parks, entities };
		}),
	);

	console.log(
		`[worker] started with ${jobs.length} jobs:`,
		jobs.map((j) => `${j.name}@${j.getPattern() ?? "?"}`).join(", "),
	);
}

export async function stopWorker(): Promise<void> {
	for (const job of jobs) job.stop();
	jobs.length = 0;
}
