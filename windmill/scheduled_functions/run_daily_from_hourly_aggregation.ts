// Windmill Script: Daily Aggregation
// Language: TypeScript (Deno)
// Description: Aggregate hourly ride statistics into daily statistics

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main(date?: string, cleanup: boolean = true) {
	// Get environment variables (Windmill provides these)
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Default to yesterday if no date provided
	const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

	console.log(`Starting daily aggregation for ${targetDate}`);

	// Get all active rides
	const { data: rides, error: ridesError } = await supabase.from("rides").select("id, name").eq("is_active", true);

	if (ridesError) {
		throw new Error(`Error fetching rides: ${ridesError.message}`);
	}

	if (!rides || rides.length === 0) {
		return {
			success: true,
			date: targetDate,
			totalRides: 0,
			message: "No active rides found",
		};
	}

	let successCount = 0;
	let errorCount = 0;
	let cleanupCount = 0;

	// Process each ride - aggregate from hourly to daily
	for (const ride of rides) {
		try {
			// First ensure hourly data exists for this date
			const { error: hourlyError } = await supabase.rpc("aggregate_all_hourly_stats_for_date", {
				p_ride_id: ride.id,
				p_date: targetDate,
			});

			if (hourlyError) {
				console.error(`Error ensuring hourly stats for ${ride.name}:`, hourlyError);
				errorCount++;
				continue;
			}

			// Then aggregate hourly data into daily
			const { error: dailyError } = await supabase.rpc("aggregate_daily_from_hourly", {
				p_ride_id: ride.id,
				p_date: targetDate,
			});

			if (dailyError) {
				console.error(`Error aggregating daily stats for ${ride.name}:`, dailyError);
				errorCount++;
			} else {
				console.log(`✅ Aggregated daily stats for ${ride.name}`);
				successCount++;
			}
		} catch (error) {
			console.error(`Exception processing daily stats for ${ride.name}:`, error);
			errorCount++;
		}
	}

	// Optional: Clean up only very old raw data (e.g., > 30 days)
	if (cleanup && successCount > 0) {
		const cleanupDate = new Date(targetDate);
		cleanupDate.setDate(cleanupDate.getDate() - 30); // Keep 30 days of raw data

		const { count } = await supabase.from("ride_wait_times").delete().lt("recorded_at_local", cleanupDate.toISOString());

		cleanupCount = count || 0;
		console.log(`✅ Cleaned up ${cleanupCount} raw records older than 30 days`);
	}

	return {
		success: true,
		date: targetDate,
		totalRides: rides.length,
		successCount,
		errorCount,
		cleanupCount,
		message: `Daily aggregation completed for ${targetDate}`,
	};
}
