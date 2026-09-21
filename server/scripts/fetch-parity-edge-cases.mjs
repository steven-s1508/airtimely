/**
 * Second pass over the parity fixtures: adds the golden day named in DECISIONS.md §9
 * and the two edge cases the rollup is most likely to get wrong — a day with no
 * schedule entry at all, and a window that runs past local midnight.
 *
 * Read-only, appends to test/fixtures/rollup-parity.json.
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

const DAILY_COLS =
	"date,avg_wait_time_minutes,operational_percentage,downtime_minutes,min_wait_time_minutes," +
	"max_wait_time_minutes,median_wait_time_minutes,peak_wait_time_hour,lowest_wait_time_hour,hourly_data";

function prevDate(localDate) {
	const d = new Date(`${localDate}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

async function buildCase(rideId, localDate, note) {
	const [ride] = await get(`rides?select=id,name,park_id,parks(name,timezone)&id=eq.${rideId}`);
	if (!ride) return null;
	const [daily] = await get(
		`daily_ride_statistics?select=${DAILY_COLS}&ride_id=eq.${rideId}&date=eq.${localDate}`,
	);
	if (!daily?.hourly_data?.length) return null;

	const schedule = await get(
		`parks_schedule?select=date,type,opening_time,closing_time&park_id=eq.${ride.park_id}` +
			`&date=in.(${prevDate(localDate)},${localDate})&type=eq.OPERATING`,
	);

	return {
		label: `${ride.parks.name} / ${ride.name} / ${localDate}${note ? ` [${note}]` : ""}`,
		note,
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

const out = path.join(import.meta.dirname, "../test/fixtures/rollup-parity.json");
const cases = JSON.parse(fs.readFileSync(out, "utf8"));
const have = new Set(cases.map((c) => `${c.rideId}|${c.localDate}`));

function add(built) {
	if (!built) return false;
	const key = `${built.rideId}|${built.localDate}`;
	if (have.has(key)) return false;
	have.add(key);
	cases.push(built);
	console.log(`  + ${built.label}`);
	return true;
}

// 1. The golden day: DECISIONS.md §9 records avg 31.61 / 100% / 0 after the patches.
add(await buildCase("2b0116fd-dafb-4615-8869-6ca934c461ba", "2026-09-12", "golden"));

// 2. No schedule for the day -> v1 leaves uptime and downtime NULL, never guessed.
//    A null operational_percentage is exactly that signature.
const noSched = await get(
	`daily_ride_statistics?select=ride_id,date&operational_percentage=is.null` +
		`&hourly_data=not.is.null&date=gte.2026-09-01&date=lte.2026-09-13&limit=25`,
);
let added = 0;
for (const row of noSched) {
	if (added >= 2) break;
	const built = await buildCase(row.ride_id, row.date, "no-schedule");
	if (built && built.schedule.length === 0 && add(built)) added++;
}
if (added === 0) console.warn("  ! no no-schedule case found");

// 3. A window running past local midnight: closing_time lands on the next local day.
const windows = await get(
	`parks_schedule?select=park_id,date,opening_time,closing_time&type=eq.OPERATING&date=eq.2026-09-12&limit=400`,
);
const pastMidnight = windows.filter((w) => {
	if (!w.opening_time || !w.closing_time) return false;
	return new Date(w.closing_time).getTime() - new Date(w.opening_time).getTime() > 0
		&& new Date(w.closing_time).toISOString().slice(0, 10) !== new Date(w.opening_time).toISOString().slice(0, 10);
});
console.log(`  (${pastMidnight.length} windows crossing a UTC date boundary)`);

let midnightAdded = 0;
for (const w of pastMidnight) {
	if (midnightAdded >= 2) break;
	const rides = await get(`rides?select=id&park_id=eq.${w.park_id}&is_active=eq.true&limit=12`);
	for (const r of rides) {
		if (midnightAdded >= 2) break;
		const built = await buildCase(r.id, "2026-09-12", "past-midnight");
		if (built && add(built)) midnightAdded++;
	}
}

fs.writeFileSync(out, JSON.stringify(cases, null, "\t") + "\n");
console.log(`\ntotal ${cases.length} cases`);
console.log("timezones     :", [...new Set(cases.map((c) => c.timezone))].join(", "));
console.log("no-schedule   :", cases.filter((c) => c.schedule.length === 0).length);
console.log("past-midnight :", cases.filter((c) => c.note === "past-midnight").length);
console.log("null uptime   :", cases.filter((c) => c.expected.uptime === null).length);
