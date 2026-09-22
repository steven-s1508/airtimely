import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { sql } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

describe("startup migrations", () => {
	after(async () => {
		await sql.end({ timeout: 5 });
	});

	it("brings the schema up to date and is a no-op when it already is", async () => {
		await runMigrations();
		const [{ n: first }] = await sql<{ n: number }[]>`
			select count(*)::int as n from drizzle.__drizzle_migrations
		`;

		await runMigrations();
		const [{ n: second }] = await sql<{ n: number }[]>`
			select count(*)::int as n from drizzle.__drizzle_migrations
		`;
		assert.equal(second, first, "a second run applies nothing");

		const [column] = await sql`
			select 1 from information_schema.columns
			where table_name = 'rides' and column_name = 'name_override'
		`;
		assert.ok(column, "rides.name_override exists");
	});

	it("serialises concurrent runs instead of racing", async () => {
		// The api and worker containers start together on every deploy.
		await Promise.all([runMigrations(), runMigrations()]);
	});
});
