/**
 * One-shot Phase 7 transform: v1 (Supabase) data into a freshly migrated v2 database.
 *
 * Runs against a LOCAL Postgres 18 that holds both databases: the restored v1 dump and
 * the empty v2 target. The verified result is then moved to Coolify with
 * pg_dump/pg_restore, so the transform itself never runs against production.
 *
 *   docker exec airtimely-pg18 pg_restore -U dev -d v1 --no-owner --no-privileges /tmp/v1.dump
 *   DATABASE_URL=postgres://dev:dev@127.0.0.1:55432/airtimely_v2 npm run db:migrate
 *   DATABASE_URL=postgres://dev:dev@127.0.0.1:55432/airtimely_v2 \
 *     node --import tsx scripts/transform-v1/run.ts
 *
 * Steps:
 *   1. Link the v1 database as schema `v1` via postgres_fdw.
 *   2. Entities and schedules (01-entities.sql).
 *   3. hourly_data -> ride_stats_hourly, month by month (02-hourly.sql).
 *   4. ride_stats_daily via the worker's own rollup.sql, per park-day. Deliberately the
 *      production code path: the transform is then also a parity run of the rollup
 *      over all of v1's history, not just the 15 fixture days.
 *   5. Days on which a ride never operated (03-closed-days.sql).
 *   6. Verify against v1 and print the report (alone: --verify-only).
 *   7. Drop the link, so a dump of this database carries nothing of it.
 *
 * Kept for the record; delete with the other v1 scripts at decommission (Phase 10).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "../../src/db/index.js";
import { rollupParkDay } from "../../src/lib/stats/rollup.js";

const DIR = import.meta.dirname;
const read = (name: string) => readFileSync(path.join(DIR, name), "utf8");

/** The v1 database's name on the same server, as seen from inside the container. */
const V1_DBNAME = process.env["V1_DBNAME"] ?? "v1";
const ROLLUP_CONCURRENCY = 8;

function log(message: string): void {
	console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);
}

async function guard(): Promise<void> {
	const url = new URL(process.env["DATABASE_URL"]!);
	if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
		throw new Error(`refusing to run against ${url.hostname}: this transform is local-only`);
	}
	const [{ parks }] = await sql<{ parks: number }[]>`select count(*)::int as parks from parks`;
	if (parks > 0) {
		throw new Error("target is not empty: drop and re-migrate the database first");
	}
}

async function link(): Promise<void> {
	const url = new URL(process.env["DATABASE_URL"]!);
	await sql`create extension if not exists postgres_fdw`;
	await sql.unsafe(`drop server if exists v1_src cascade`);
	await sql.unsafe(
		`create server v1_src foreign data wrapper postgres_fdw
		 options (host 'localhost', port '5432', dbname '${V1_DBNAME}', fetch_size '20000')`,
	);
	await sql.unsafe(
		`create user mapping for current_user server v1_src
		 options (user '${decodeURIComponent(url.username)}', password '${decodeURIComponent(url.password)}')`,
	);
	await sql.unsafe(`drop schema if exists v1 cascade`);
	await sql.unsafe(`create schema v1`);
	await sql.unsafe(
		`import foreign schema public limit to (
			chains, destinations, parks, rides, shows, show_times, restaurants,
			parks_schedule, daily_ride_statistics
		) from server v1_src into v1`,
	);
}

async function unlink(): Promise<void> {
	await sql.unsafe(`drop schema if exists v1 cascade`);
	await sql.unsafe(`drop server if exists v1_src cascade`);
	await sql.unsafe(`drop extension if exists postgres_fdw`);
}

async function entities(): Promise<void> {
	await sql.begin((tx) => tx.unsafe(read("01-entities.sql")).simple());
}

async function hourly(): Promise<void> {
	const [range] = await sql<{ first: string; last: string }[]>`
		select min(date)::text as first, max(date)::text as last from v1.daily_ride_statistics
	`;
	const hourlySql = read("02-hourly.sql");

	let from = `${range!.first.slice(0, 7)}-01`;
	while (from <= range!.last) {
		const [{ to }] = await sql<{ to: string }[]>`
			select (${from}::date + interval '1 month')::date::text as to
		`;
		const result = await sql.unsafe(hourlySql, [from, to]);
		log(`hourly ${from.slice(0, 7)}: ${result.count.toLocaleString()} buckets`);
		from = to;
	}
}

async function daily(): Promise<void> {
	const parkDays = await sql<{ park_id: string; local_date: string }[]>`
		select distinct r.park_id, h.local_date
		from ride_stats_hourly h
		join rides r on r.id = h.ride_id
		order by h.local_date, r.park_id
	`;
	log(`rolling up ${parkDays.length.toLocaleString()} park-days`);

	let next = 0;
	let done = 0;
	const worker = async () => {
		while (next < parkDays.length) {
			const pd = parkDays[next++]!;
			await rollupParkDay(pd.park_id, pd.local_date);
			if (++done % 5000 === 0) log(`  ${done.toLocaleString()} park-days`);
		}
	};
	await Promise.all(Array.from({ length: ROLLUP_CONCURRENCY }, worker));
	const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ride_stats_daily`;
	log(`rollup wrote ${n.toLocaleString()} daily rows`);

	const closed = await sql.unsafe(read("03-closed-days.sql"));
	log(`closed days: ${closed.count.toLocaleString()} rows`);
}

async function verify(): Promise<void> {
	// One connection throughout: the temp table below exists only on the session that
	// created it, and the pool would otherwise hand each query a different one.
	const db = await sql.reserve();
	try {
		await verifyOn(db);
	} finally {
		db.release();
	}
}

async function verifyOn(db: typeof sql): Promise<void> {
	const counts = await db<{ table: string; v1: number; v2: number }[]>`
		select 'chains' as table, (select count(*) from v1.chains)::int as v1, (select count(*) from chains)::int as v2
		union all select 'destinations', (select count(*) from v1.destinations), (select count(*) from destinations)
		union all select 'parks', (select count(*) from v1.parks), (select count(*) from parks)
		union all select 'rides', (select count(*) from v1.rides), (select count(*) from rides)
		union all select 'shows', (select count(*) from v1.shows), (select count(*) from shows)
		union all select 'show_times', (select count(*) from v1.show_times), (select count(*) from show_times)
		union all select 'restaurants', (select count(*) from v1.restaurants), (select count(*) from restaurants)
		union all select 'parks_schedule', (select count(*) from v1.parks_schedule), (select count(*) from parks_schedule)
		union all select 'daily', (select count(*) from v1.daily_ride_statistics), (select count(*) from ride_stats_daily)
	`;
	console.table(counts);

	// Materialise v1's daily figures locally once; comparing over the FDW row by row
	// would be slow and the check touches every row.
	await db`drop table if exists pg_temp.v1_daily`;
	await db`
		create temp table v1_daily as
		select ride_id, date, avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes,
			operational_percentage, downtime_minutes, peak_wait_time_hour, lowest_wait_time_hour
		from v1.daily_ride_statistics
	`;
	await db`create index on v1_daily (ride_id, date)`;

	const [parity] = await db<Record<string, number>[]>`
		with j as (
			select
				o.*,
				n.ride_id is not null as present,
				case when n.wait_minutes > 0 then n.wait_sum::numeric / n.wait_minutes end as mean,
				case when n.scheduled_min > 0
					then least(100, round(n.operating_min * 100.0 / n.scheduled_min, 2)) end as uptime,
				n.down_min, n.wait_min, n.wait_max, n.peak_hour, n.quietest_hour
			from v1_daily o
			left join ride_stats_daily n on n.ride_id = o.ride_id and n.local_date = o.date
		)
		select
			count(*)::int as rows,
			count(*) filter (where not present)::int as missing,
			count(*) filter (where (avg_wait_time_minutes is null) <> (mean is null))::int as mean_nullness,
			count(*) filter (where abs(avg_wait_time_minutes - mean) > 0.01)::int as mean_gt_001,
			count(*) filter (where abs(avg_wait_time_minutes - mean) > 0.1)::int as mean_gt_01,
			count(*) filter (where abs(avg_wait_time_minutes - mean) > 1)::int as mean_gt_1,
			round(max(abs(avg_wait_time_minutes - mean)), 3)::float as mean_max_delta,
			count(*) filter (where (operational_percentage is null) <> (uptime is null))::int as uptime_nullness,
			count(*) filter (where abs(operational_percentage - uptime) > 0.1)::int as uptime_gt_01,
			count(*) filter (where abs(operational_percentage - uptime) > 1)::int as uptime_gt_1,
			count(*) filter (where downtime_minutes is distinct from down_min)::int as downtime_diff,
			count(*) filter (where abs(downtime_minutes - down_min) > 1)::int as downtime_gt_1,
			count(*) filter (where min_wait_time_minutes is distinct from wait_min)::int as min_diff,
			count(*) filter (where max_wait_time_minutes is distinct from wait_max)::int as max_diff,
			count(*) filter (where peak_wait_time_hour is distinct from peak_hour)::int as peak_diff,
			count(*) filter (where lowest_wait_time_hour is distinct from quietest_hour)::int as quiet_diff
		from j
	`;
	console.table(Object.entries(parity!).map(([check, value]) => ({ check, value })));

	const [extra] = await db<{ extra: number }[]>`
		select count(*)::int as extra from ride_stats_daily n
		where not exists (select 1 from v1_daily o where o.ride_id = n.ride_id and o.date = n.local_date)
	`;
	log(`v2 daily rows with no v1 counterpart: ${extra!.extra}`);
}

async function main(): Promise<void> {
	const started = Date.now();
	if (process.argv.includes("--verify-only")) {
		await link();
		try {
			await verify();
		} finally {
			await unlink();
		}
		await sql.end({ timeout: 5 });
		return;
	}
	await guard();
	log("linking v1");
	await link();
	try {
		log("entities");
		await entities();
		log("hourly");
		await hourly();
		log("daily");
		await daily();
		log("analyze");
		await sql`analyze`;
		log("verify");
		await verify();
	} finally {
		await unlink();
	}
	log(`done in ${Math.round((Date.now() - started) / 1000)}s`);
	await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
	console.error(error);
	await sql.end({ timeout: 5 });
	process.exit(1);
});
