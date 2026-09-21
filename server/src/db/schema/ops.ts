import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	jsonb,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { parks } from "./entities.js";

/**
 * One row per park-day, driving the nightly finalisation. A park-day that fails is
 * retried for up to 30 days — the history API's window with the free key — and the
 * day's raw `ride_changes` are only deleted once `finalisedAt` is set.
 */
export const parkDayIngest = pgTable(
	"park_day_ingest",
	{
		parkId: uuid("park_id")
			.notNull()
			.references(() => parks.id, { onDelete: "cascade" }),
		localDate: date("local_date", { mode: "string" }).notNull(),
		/** Which change stream produced the result: history API, or own poller data. */
		source: smallint("source"),
		status: smallint("status").notNull().default(0),
		attempts: smallint("attempts").notNull().default(0),
		lastError: text("last_error"),
		finalisedAt: timestamp("finalised_at", { withTimezone: true }),
	},
	(t) => [
		primaryKey({ columns: [t.parkId, t.localDate] }),
		// Drives "what still needs finalising", the job's main query.
		index("idx_park_day_ingest_status").on(t.status, t.localDate),
	],
);

/**
 * Job bookkeeping. Every run opens a row on entry and closes it with ok/summary/error
 * whatever the outcome — the absence of exactly this is what let a Windmill crash go
 * unnoticed from 2026-09-14 to 09-18.
 */
export const jobRuns = pgTable(
	"job_runs",
	{
		// uuidv7 is time-ordered, so the primary key clusters by insertion time.
		id: uuid("id")
			.primaryKey()
			.default(sql`uuidv7()`),
		job: text("job").notNull(),
		startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
		finishedAt: timestamp("finished_at", { withTimezone: true }),
		ok: boolean("ok"),
		summary: jsonb("summary"),
		error: text("error"),
	},
	(t) => [index("idx_job_runs_job_started").on(t.job, t.startedAt.desc())],
);
