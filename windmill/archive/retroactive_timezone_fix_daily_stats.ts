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

// Helper to calculate comprehensive stats from filtered hourly data
function calcComprehensiveStats(hourly: any[]) {
	// Filter out null/invalid values
	const validData = hourly.filter((h) => h.avg !== null && h.avg !== undefined && h.avg !== "null" && h.min !== null && h.min !== undefined && h.min !== "null" && h.max !== null && h.max !== undefined && h.max !== "null");

	if (validData.length === 0) {
		return {
			avg: 0,
			min: 0,
			max: 0,
			median: 0,
			total: 0,
			avg_s: 0,
			min_s: 0,
			max_s: 0,
			operational_percentage: 0,
			downtime_minutes: 0,
			peak_hour: null,
			peak_value: null,
			lowest_hour: null,
		};
	}

	// Basic wait time stats
	const avgs = validData.map((h) => (typeof h.avg === "number" ? h.avg : parseFloat(h.avg))).filter((v) => !isNaN(v));
	const mins = validData.map((h) => (typeof h.min === "number" ? h.min : parseInt(h.min))).filter((v) => !isNaN(v));
	const maxs = validData.map((h) => (typeof h.max === "number" ? h.max : parseInt(h.max))).filter((v) => !isNaN(v));

	// Single rider stats
	const avg_s_values = validData.map((h) => (h.avg_s !== null && h.avg_s !== undefined && h.avg_s !== "null" ? (typeof h.avg_s === "number" ? h.avg_s : parseFloat(h.avg_s)) : null)).filter((v) => v !== null && !isNaN(v));
	const min_s_values = validData.map((h) => (h.avg_s !== null && h.avg_s !== undefined && h.avg_s !== "null" ? (typeof h.avg_s === "number" ? h.avg_s : parseInt(h.avg_s)) : null)).filter((v) => v !== null && !isNaN(v));
	const max_s_values = validData.map((h) => (h.avg_s !== null && h.avg_s !== undefined && h.avg_s !== "null" ? (typeof h.avg_s === "number" ? h.avg_s : parseInt(h.avg_s)) : null)).filter((v) => v !== null && !isNaN(v));

	// Operational stats
	const operational_minutes = validData.map((h) => (h.op !== null && h.op !== undefined && h.op !== "null" ? (typeof h.op === "number" ? h.op : parseInt(h.op)) : 0)).reduce((sum, op) => sum + op, 0);

	const total_data_points = validData.map((h) => (h.data !== null && h.data !== undefined && h.data !== "null" ? (typeof h.data === "number" ? h.data : parseInt(h.data)) : 0)).reduce((sum, data) => sum + data, 0);

	const total_possible_minutes = total_data_points * 5; // 5 minutes per data point
	const operational_percentage = total_possible_minutes > 0 ? Math.round(((operational_minutes * 100) / total_possible_minutes) * 100) / 100 : 0;
	const downtime_minutes = Math.max(0, total_possible_minutes - operational_minutes);

	// Calculate basic stats
	const avg = avgs.length > 0 ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100 : 0;
	const min = mins.length > 0 ? Math.min(...mins) : 0;
	const max = maxs.length > 0 ? Math.max(...maxs) : 0;

	const avg_s = avg_s_values.length > 0 ? Math.round((avg_s_values.reduce((a, b) => a + b, 0) / avg_s_values.length) * 100) / 100 : 0;
	const min_s = min_s_values.length > 0 ? Math.min(...min_s_values) : 0;
	const max_s = max_s_values.length > 0 ? Math.max(...max_s_values) : 0;

	// Median calculation
	avgs.sort((a, b) => a - b);
	const median = avgs.length > 0 ? (avgs.length % 2 === 0 ? Math.round(((avgs[avgs.length / 2 - 1] + avgs[avgs.length / 2]) / 2) * 100) / 100 : avgs[Math.floor(avgs.length / 2)]) : 0;

	// Find peak and lowest hours
	let peak_hour = null,
		peak_value = null,
		lowest_hour = null;
	if (validData.length > 0) {
		const sortedByAvg = [...validData].sort((a, b) => {
			const avgA = typeof a.avg === "number" ? a.avg : parseFloat(a.avg);
			const avgB = typeof b.avg === "number" ? b.avg : parseFloat(b.avg);
			if (avgA !== avgB) return avgB - avgA; // Descending by avg
			const maxA = typeof a.max === "number" ? a.max : parseInt(a.max);
			const maxB = typeof b.max === "number" ? b.max : parseInt(b.max);
			return maxB - maxA; // Descending by max if avg is equal
		});
		peak_hour = sortedByAvg[0].h;
		peak_value = typeof sortedByAvg[0].max === "number" ? sortedByAvg[0].max : parseInt(sortedByAvg[0].max);

		const sortedByAvgAsc = [...validData].sort((a, b) => {
			const avgA = typeof a.avg === "number" ? a.avg : parseFloat(a.avg);
			const avgB = typeof b.avg === "number" ? b.avg : parseFloat(b.avg);
			if (avgA !== avgB) return avgA - avgB; // Ascending by avg
			const minA = typeof a.min === "number" ? a.min : parseInt(a.min);
			const minB = typeof b.min === "number" ? b.min : parseInt(b.min);
			return minA - minB; // Ascending by min if avg is equal
		});
		lowest_hour = sortedByAvgAsc[0].h;
	}

	return {
		avg,
		min,
		max,
		median,
		total: validData.length,
		avg_s,
		min_s,
		max_s,
		operational_percentage,
		downtime_minutes,
		peak_hour,
		peak_value,
		lowest_hour,
	};
}

export async function main(
	date?: string, // Format: YYYY-MM-DD
	ride_id?: string // UUID string
) {
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");
	if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Build query based on parameters
	let query = supabase.from("daily_ride_statistics").select("id, ride_id, date, hourly_data").not("hourly_data", "is", null);

	if (date) {
		query = query.eq("date", date);
	}

	if (ride_id) {
		query = query.eq("ride_id", ride_id);
	}

	// Get daily_ride_statistics with hourly_data
	const { data: dailyStats, error } = await query;

	if (error) throw new Error("Failed to fetch daily_ride_statistics: " + error.message);

	let updated = 0,
		failed = 0;

	// Build log message based on parameters
	let logMessage = `Starting retroactive timezone fix for ${dailyStats.length} daily_ride_statistics rows`;
	if (date) logMessage += ` for date ${date}`;
	if (ride_id) logMessage += ` for ride_id ${ride_id}`;
	console.log(logMessage + "...");

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

		// Calculate comprehensive stats
		const stats = calcComprehensiveStats(filtered);

		// Update row with all columns
		const { error: updateError } = await supabase
			.from("daily_ride_statistics")
			.update({
				avg_wait_time_minutes: stats.avg,
				min_wait_time_minutes: stats.min,
				max_wait_time_minutes: stats.max,
				median_wait_time_minutes: stats.median,
				total_data_points: stats.total,
				avg_single_rider_wait_minutes: stats.avg_s,
				min_single_rider_wait_minutes: stats.min_s,
				max_single_rider_wait_minutes: stats.max_s,
				operational_percentage: stats.operational_percentage,
				downtime_minutes: stats.downtime_minutes,
				peak_wait_time_hour: stats.peak_hour,
				peak_wait_time_value: stats.peak_value,
				lowest_wait_time_hour: stats.lowest_hour,
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
