import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env.js";
import * as schema from "./schema/index.js";

/**
 * `drizzle(client)` MUTATES the postgres.js client it is handed: it installs its own
 * parsers and serializers so that timestamptz and date come back as strings and Date
 * parameters are rejected. That is correct for Drizzle's own mapping layer, but it
 * silently changes the behaviour of every raw `sql` query sharing the client.
 *
 * Almost all of this codebase is raw SQL by design (the aggregations especially), so
 * the raw client below is kept unwrapped and Drizzle gets its own connection. Do not
 * pass `sql` to `drizzle()`.
 *
 * Consequence: a transaction cannot span both handles. In practice nothing needs to —
 * the worker writes exclusively through `sql`, and API reads are single statements.
 */

const commonOptions = {
	idle_timeout: 30,
	connect_timeout: 10,
	connection: {
		// Pinned per-connection rather than via ALTER ROLE so a rebuilt database
		// cannot lose it. Without it, a bare `::date` cast or date_trunc() on a
		// timestamptz silently resolves against whatever zone the container booted
		// with — the same class of bug that corrupted every non-UTC park's stats in v1.
		TimeZone: "UTC",
	},
} as const;

/**
 * Primary handle. Pool is deliberately small: the worker holds long transactions
 * during finalisation and the api is cache-fronted.
 */
export const sql = postgres(env.databaseUrl, {
	...commonOptions,
	max: env.role === "api" ? 10 : 5,
	types: {
		/**
		 * Return `date` columns as plain 'YYYY-MM-DD' strings.
		 *
		 * postgres.js would otherwise hand back a Date pinned to UTC midnight, which
		 * renders as the previous day in any negative-offset zone — and every date in
		 * this schema (`local_date`) is a park-local calendar date, not an instant.
		 * The schema declares these columns `mode: "string"` for the same reason.
		 */
		date: {
			to: 1082,
			from: [1082],
			serialize: (value: string) => value,
			parse: (value: string) => value,
		},
	},
});

let drizzleDb: PostgresJsDatabase<typeof schema> | null = null;

/**
 * Drizzle handle, over its own client so its mutations cannot reach `sql`.
 * Constructed on first use, so the second pool is never opened unless something
 * actually uses the query builder.
 */
export function getDb(): PostgresJsDatabase<typeof schema> {
	if (!drizzleDb) {
		const client = postgres(env.databaseUrl, { ...commonOptions, max: 3 });
		drizzleDb = drizzle(client, { schema });
	}
	return drizzleDb;
}

export type Db = ReturnType<typeof getDb>;
