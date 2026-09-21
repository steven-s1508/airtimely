import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { parks } from "./entities.js";
import { scheduleTypeEnum } from "./enums.js";

/**
 * Park opening windows. `opening_time`/`closing_time` are `timestamptz` here; v1
 * stored them as `text` and cast at every read site.
 *
 * A window may run past local midnight, so any query for a park-local day must
 * consider entries for both that `local_date` and the one before it. Note the
 * inverse trap: selecting days that have *no* schedule must look at the day's own
 * entry only — including `local_date - 1` silently excluded every Monday whose
 * Sunday had hours.
 */
export const parksSchedule = pgTable(
	"parks_schedule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		parkId: uuid("park_id")
			.notNull()
			.references(() => parks.id, { onDelete: "cascade" }),
		localDate: date("local_date", { mode: "string" }).notNull(),
		type: scheduleTypeEnum("type").notNull(),
		openingTime: timestamp("opening_time", { withTimezone: true }),
		closingTime: timestamp("closing_time", { withTimezone: true }),
		description: text("description"),
		purchases: jsonb("purchases"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("parks_schedule_unique").on(
			t.parkId,
			t.localDate,
			t.type,
			t.openingTime,
			t.closingTime,
		),
		index("idx_parks_schedule_park_date").on(t.parkId, t.localDate),
		index("idx_parks_schedule_date_type").on(t.localDate, t.type),
	],
);
