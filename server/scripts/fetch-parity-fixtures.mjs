/**
 * One-shot: pulls corrected v1 daily rows + their hourly_data out of the live Supabase
 * via PostgREST, to use as parity fixtures for the Phase 4 rollup port.
 *
 * Read-only. Uses the anon key already shipped in the APK. Delete along with the rest
 * of the Supabase tooling at decommission (Phase 10).
 *
 *   node scripts/fetch-parity-fixtures.mjs
 */
import fs from "node:fs";
import path from "node:path";

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

const DATE = "2026-09-12";

/** A spread of timezones, so an offset bug cannot hide behind a single zone. */
const PARK_NAMES = [
	"Magic Kingdom Park",
	"Disneyland Park",
	"Europa-Park",
	"Tokyo Disneyland",
	"Disneyland Paris",
	"Phantasialand",
];

async function buildCase(ride, localDate) {
	const [daily] = await get(
		`daily_ride_statistics?select=date,avg_wait_time_minutes,operational_percentage,` +
			`downtime_minutes,min_wait_time_minutes,max_wait_time_minutes,median_wait_time_minutes,` +
			`peak_wait_time_hour,lowest_wait_time_hour,hourly_data&ride_id=eq.${ride.id}&date=eq.${localDate}`,
	);
	if (!daily?.hourly_data?.length) return null;

	// Windows for the day and the one before it: a window may run past local midnight.
	const prev = new Date(`${localDate}T00:00:00Z`);
	prev.setUTCDate(prev.getUTCDate() - 1);
	const prevDate = prev.toISOString().slice(0, 10);

	const schedule = await get(
		`parks_schedule?select=date,type,opening_time,closing_time&park_id=eq.${ride.park_id}` +
			`&date=in.(${prevDate},${localDate})&type=eq.OPERATING`,
	);

	return {
		label: `${ride.parks.name} / ${ride.name} / ${localDate}`,
		rideId: ride.id,
		parkId: ride.park_id,
		parkName: ride.parks.name,
		timezone: ride.parks.timezone,
		localDate,
		hourlyData: daily.hourly_data,
		schedule,
		expected: {
			avg: daily.avg_wait_time_minutes,
			uptime: daily.operational_percentage,
			downtime: daily.downtime_minutes,
			min: daily.min_wait_time_minutes,
			max: daily.max_wait_time_minutes,
			medianOfHourlyAverages: daily.median_wait_time_minutes,
			peakHour: daily.peak_wait_time_hour,
			quietestHour: daily.lowest_wait_time_hour,
		},
	};
}

const cases = [];

for (const parkName of PARK_NAMES) {
	const parks = await get(`parks?select=id,name,timezone&name=eq.${encodeURIComponent(parkName)}&limit=1`);
	if (!parks.length) {
		console.warn(`  skip: no park named ${parkName}`);
		continue;
	}
	const park = parks[0];

	const rides = await get(
		`rides?select=id,name,park_id,parks(name,timezone)&park_id=eq.${park.id}&is_active=eq.true&limit=40`,
	);

	let added = 0;
	for (const ride of rides) {
		if (added >= 2) break;
		const built = await buildCase(ride, DATE);
		if (!built) continue;
		cases.push(built);
		added++;
		console.log(`  + ${built.label}  (hours: ${built.hourlyData.length}, sched: ${built.schedule.length})`);
	}
	if (added === 0) console.warn(`  skip: no usable ride-day at ${parkName}`);
}

const out = path.join(import.meta.dirname, "../test/fixtures/rollup-parity.json");
fs.writeFileSync(out, JSON.stringify(cases, null, "\t") + "\n");
console.log(`\nwrote ${cases.length} cases -> ${path.relative(process.cwd(), out)}`);
console.log("timezones:", [...new Set(cases.map((c) => c.timezone))].join(", "));
console.log("no-schedule cases:", cases.filter((c) => c.schedule.length === 0).length);
