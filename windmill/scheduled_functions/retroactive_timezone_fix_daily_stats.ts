// Windmill Script: Retroactively fix daily_ride_statistics with timezone-aware park hours
// Language: TypeScript (Deno)

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to parse ISO hour from timestamptz string
function getHourFromTz(ts: string, timezone: string): number {
	const date = new Date(ts);
	// Use Intl.DateTimeFormat to get hour in park's timezone
	const fmt = new Intl.DateTimeFormat("en-CA", { hour: "2-digit", hour12: false, timeZone: timezone });
	return parseInt(fmt.format(date));
}

// Helper to calculate stats from filtered hourly data
function calcStats(hourly: any[]): {
	avg: number;
	min: number;
	max: number;
	median: number;
	total: number;
} {
	const avgs = hourly.map((h) => (typeof h.avg === "number" ? h.avg : typeof h.avg === "string" ? parseFloat(h.avg) : null)).filter((v) => v !== null);
	if (avgs.length === 0) return { avg: 0, min: 0, max: 0, median: 0, total: 0 };
	avgs.sort((a, b) => a - b);
	const avg = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100;
	const min = Math.min(...avgs);
	const max = Math.max(...avgs);
	const median = avgs.length % 2 === 0 ? Math.round(((avgs[avgs.length / 2 - 1] + avgs[avgs.length / 2]) / 2) * 100) / 100 : avgs[Math.floor(avgs.length / 2)];
	return { avg, min, max, median, total: avgs.length };
}

export async function main() {
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");
	if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Get all daily_ride_statistics with hourly_data
	const { data: dailyStats, error } = await supabase.from("daily_ride_statistics").select("id, ride_id, date, hourly_data").not("hourly_data", "is", null);

	if (error) throw new Error("Failed to fetch daily_ride_statistics: " + error.message);

	let updated = 0,
		failed = 0;

	console.log(`Starting retroactive timezone fix for ${dailyStats.length} daily_ride_statistics rows...`);

	for (let i = 0; i < dailyStats.length; i++) {
		const row = dailyStats[i];
		if (i % 100 === 0) {
			console.log(`Processing row ${i + 1} of ${dailyStats.length} (updated: ${updated}, failed: ${failed})`);
		}
		// Get park_id and timezone
		const { data: ride, error: rideError } = await supabase.from("rides").select("park_id").eq("id", row.ride_id).single();
		if (rideError || !ride) {
			failed++;
			continue;
		}

		const { data: park, error: parkError } = await supabase.from("parks").select("timezone").eq("id", ride.park_id).single();
		if (parkError || !park) {
			failed++;
			continue;
		}

		// Get park operating hours for this date
		const { data: poh, error: pohError } = await supabase.from("park_operating_hours").select("opening_time, closing_time").eq("park_id", ride.park_id).eq("date", row.date).single();

		if (pohError || !poh || !poh.opening_time || !poh.closing_time) {
			failed++;
			continue;
		}

		const openHour = getHourFromTz(poh.opening_time, park.timezone);
		const closeHour = getHourFromTz(poh.closing_time, park.timezone);

		// Parse hourly_data (array of objects with 'h' and 'avg')
		let hourly: any[] = [];
		try {
			hourly = Array.isArray(row.hourly_data) ? row.hourly_data : JSON.parse(row.hourly_data);
		} catch {
			failed++;
			continue;
		}

		// Filter to only hours within open-close (handle close after midnight)
		const filtered = hourly.filter((h) => {
			if (openHour <= closeHour) {
				return h.h >= openHour && h.h < closeHour;
			} else {
				// Park open past midnight
				return h.h >= openHour || h.h < closeHour;
			}
		});

		// Calculate new stats
		const stats = calcStats(filtered);

		// Update row
		const { error: updateError } = await supabase
			.from("daily_ride_statistics")
			.update({
				avg_wait_time_minutes: stats.avg,
				min_wait_time_minutes: stats.min,
				max_wait_time_minutes: stats.max,
				median_wait_time_minutes: stats.median,
				total_data_points: stats.total,
			})
			.eq("id", row.id);

		if (updateError) {
			failed++;
			continue;
		}
		updated++;
	}

	return { updated, failed, total: dailyStats.length };
}
