/**
 * One-shot: copies a few real parks, their rides and their recent schedules out of the
 * live v1 database into the local dev database, so the Phase 4 jobs can be run against
 * genuine external_ids and real history.
 *
 * Read-only against Supabase. Delete at decommission (Phase 10).
 *
 *   node --env-file=../.env scripts/seed-from-v1.mjs "Magic Kingdom Park" "Europa-Park"
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = path.resolve(import.meta.dirname, "../..");
let env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
const localEnv = path.join(ROOT, ".env.local");
if (fs.existsSync(localEnv)) env += "\n" + fs.readFileSync(localEnv, "utf8");
const pick = (k) =>
	(env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");

const BASE = pick("EXPO_PUBLIC_SUPABASE_URL");
const KEY = pick("EXPO_PUBLIC_SUPABASE_ANON_KEY");
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function get(query) {
	const res = await fetch(`${BASE}/rest/v1/${query}`, {
		headers: HEADERS,
		signal: AbortSignal.timeout(45_000),
	});
	if (!res.ok) throw new Error(`${res.status} on ${query}: ${(await res.text()).slice(0, 200)}`);
	return res.json();
}

const parkNames = process.argv.slice(2);
if (parkNames.length === 0) {
	console.error("usage: seed-from-v1.mjs <park name> [<park name> ...]");
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 2 });

for (const name of parkNames) {
	const [park] = await get(
		`parks?select=id,name,slug,timezone,external_id,destination_id&name=eq.${encodeURIComponent(name)}&limit=1`,
	);
	if (!park) {
		console.warn(`skip: no park named ${name}`);
		continue;
	}

	await sql`
		insert into parks (id, name, slug, timezone, external_id, is_active)
		values (${park.id}, ${park.name}, ${park.slug ?? park.id}, ${park.timezone}, ${park.external_id}, true)
		on conflict (id) do update set
			name = excluded.name, timezone = excluded.timezone,
			external_id = excluded.external_id, is_active = true
	`;

	const rides = await get(
		`rides?select=id,name,slug,external_id,is_active&park_id=eq.${park.id}&external_id=not.is.null`,
	);
	for (const r of rides) {
		await sql`
			insert into rides (id, park_id, name, slug, external_id, is_active)
			values (${r.id}, ${park.id}, ${r.name}, ${r.slug}, ${r.external_id}, ${r.is_active})
			on conflict (id) do update set
				name = excluded.name, external_id = excluded.external_id, is_active = excluded.is_active
		`;
	}

	const schedule = await get(
		`parks_schedule?select=date,type,opening_time,closing_time&park_id=eq.${park.id}` +
			`&date=gte.${new Date(Date.now() - 12 * 864e5).toISOString().slice(0, 10)}&type=eq.OPERATING`,
	);
	for (const s of schedule) {
		if (!s.opening_time || !s.closing_time) continue;
		await sql`
			insert into parks_schedule (park_id, local_date, type, opening_time, closing_time)
			values (${park.id}, ${s.date}, 'OPERATING', ${s.opening_time}, ${s.closing_time})
			on conflict do nothing
		`;
	}

	console.log(
		`seeded ${park.name}  (${park.timezone})  rides: ${rides.length}  schedule days: ${schedule.length}`,
	);
}

await sql.end();
