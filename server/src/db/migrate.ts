import path from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { getDb, sql } from "./index.js";

/** Beside dist/ in the image, beside src/ in development. */
const MIGRATIONS_FOLDER = path.join(import.meta.dirname, "../../drizzle");

/**
 * Applies pending migrations before the process starts serving or scheduling.
 *
 * Both roles call this. The lock is a *blocking* advisory lock, unlike the jobs'
 * try-lock: whichever container starts second waits for the first to finish, then
 * finds nothing to apply. So the api can never answer a query against a column the
 * worker has not added yet — which is what a deploy of both at once would otherwise
 * risk.
 *
 * Drizzle's ledger lives in the `drizzle` schema and came across with the Phase 7
 * restore, so the migrations applied then are skipped here.
 */
export async function runMigrations(): Promise<void> {
	const reserved = await sql.reserve();
	try {
		await reserved`select pg_advisory_lock(hashtext('airtimely:migrate'))`;
		try {
			const started = Date.now();
			await migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER });
			console.log(`[migrate] schema up to date (${Date.now() - started}ms)`);
		} finally {
			await reserved`select pg_advisory_unlock(hashtext('airtimely:migrate'))`;
		}
	} finally {
		reserved.release();
	}
}
