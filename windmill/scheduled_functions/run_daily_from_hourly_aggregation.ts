// Windmill Script: Daily Aggregation
// Language: TypeScript (Deno)
// Description: Aggregate hourly ride statistics into daily statistics

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main(date?: string, cleanup: boolean = true, forceUpdate: boolean = false) {
	// Get environment variables (Windmill provides these)
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Default to yesterday if no date provided
	const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

	console.log(`Starting daily aggregation for ${targetDate} (forceUpdate: ${forceUpdate})`);

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
	let skippedCount = 0;
	let cleanupCount = 0;

	// Process each ride - aggregate from hourly to daily
	for (const ride of rides) {
		try {
			// Check if daily statistics already exist for this ride and date
			const { data: existingDaily, error: dailyCheckError } = await supabase.from("daily_ride_statistics").select("id, created_at").eq("ride_id", ride.id).eq("date", targetDate).single();

			if (dailyCheckError && dailyCheckError.code !== "PGRST116") {
				// PGRST116 = no rows found
				console.error(`Error checking existing daily stats for ${ride.name}:`, dailyCheckError);
				errorCount++;
				continue;
			}

			// If daily stats exist and we're not forcing update, check if we should skip
			if (existingDaily && !forceUpdate) {
				// Check if hourly data exists for this ride and date
				const { count: hourlyCount, error: hourlyCountError } = await supabase.from("hourly_ride_statistics").select("*", { count: "exact", head: true }).eq("ride_id", ride.id).eq("date", targetDate);

				if (hourlyCountError) {
					console.error(`Error checking hourly data for ${ride.name}:`, hourlyCountError);
					errorCount++;
					continue;
				}

				// If no hourly data exists, skip this ride
				if (!hourlyCount || hourlyCount === 0) {
					console.log(`⏭️  Skipping ${ride.name} - daily stats exist and no hourly data found`);
					skippedCount++;
					continue;
				}

				console.log(`🔄 Updating ${ride.name} - daily stats exist but hourly data found (${hourlyCount} records)`);
			} else if (existingDaily && forceUpdate) {
				console.log(`🔁 Force updating ${ride.name} - daily stats exist but forceUpdate enabled`);
			} else {
				console.log(`📊 Creating ${ride.name} - no existing daily stats found`);
			}

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
				p_cleanup: cleanup,
			});

			if (dailyError) {
				console.error(`Error aggregating daily stats for ${ride.name}:`, dailyError);
				errorCount++;
			} else {
				console.log(`✅ ${existingDaily ? "Updated" : "Created"} daily stats for ${ride.name}`);
				successCount++;
			}
		} catch (error) {
			console.error(`Exception processing daily stats for ${ride.name}:`, error);
			errorCount++;
		}
	}

	// Optional: Clean up only very old raw data (e.g., > 7 days)
	if (cleanup && successCount > 0) {
		try {
			const cleanupDate = new Date(targetDate);
			cleanupDate.setDate(cleanupDate.getDate() - 7); // Keep 7 days of raw data
			const cleanupDateStr = cleanupDate.toISOString();

			const { count, error: cleanupError } = await supabase.from("ride_wait_times").delete().lt("recorded_at_local", cleanupDateStr);

			if (cleanupError) {
				console.error(`Error during cleanup:`, cleanupError);
			} else {
				cleanupCount = count || 0;
				console.log(`✅ Cleaned up ${cleanupCount} raw records older than 30 days (before ${cleanupDateStr})`);
			}
		} catch (cleanupError) {
			console.error(`Exception during cleanup:`, cleanupError);
		}
	}

	const totalProcessed = successCount + errorCount + skippedCount;

	return {
		success: true,
		date: targetDate,
		totalRides: rides.length,
		successCount,
		errorCount,
		skippedCount,
		cleanupCount,
		totalProcessed,
		forceUpdate,
		message: `Daily aggregation completed for ${targetDate}. Processed: ${totalProcessed}/${rides.length} rides (${successCount} success, ${skippedCount} skipped, ${errorCount} errors)`,
	};
}
