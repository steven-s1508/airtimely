// Windmill Script: Hourly Ride Statistics Aggregation
// Language: TypeScript (Deno)
// Description: Aggregate raw ride wait time data into hourly statistics

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main(date?: string, hour?: number, ride_id?: number, mode: string = "single") {
	// Get environment variables (Windmill provides these)
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Calculate previous hour automatically if not specified
	const now = new Date();
	const previousHour = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
	const targetDate = date || previousHour.toISOString().split("T")[0];
	const targetHour = hour !== undefined ? hour : previousHour.getHours();

	console.log(`Starting hourly aggregation for ${targetDate} hour ${targetHour} (mode: ${mode})`);

	// Get rides to process
	let ridesQuery = supabase.from("rides").select("id, name").eq("is_active", true);
	if (ride_id) {
		ridesQuery = ridesQuery.eq("id", ride_id);
	}

	const { data: rides, error: ridesError } = await ridesQuery;
	if (ridesError) {
		throw new Error(`Error fetching rides: ${ridesError.message}`);
	}

	if (!rides || rides.length === 0) {
		return {
			success: true,
			date: targetDate,
			hour: mode === "single" ? targetHour : "all",
			mode: mode,
			totalRides: 0,
			successCount: 0,
			errorCount: 0,
			message: "No active rides found",
		};
	}

	let successCount = 0;
	let errorCount = 0;

	// Process each ride
	for (const ride of rides) {
		try {
			if (mode === "single") {
				// Process only the specified hour (default for cron jobs)
				const { error } = await supabase.rpc("aggregate_hourly_ride_stats", {
					p_ride_id: ride.id,
					p_date: targetDate,
					p_hour: targetHour,
				});

				if (error) {
					console.error(`Error aggregating hour ${targetHour} for ${ride.name}:`, error);
					errorCount++;
				} else {
					console.log(`✅ Aggregated hour ${targetHour} for ${ride.name}`);
					successCount++;
				}
			} else {
				// Process all 24 hours (for manual runs or catch-up)
				const { error } = await supabase.rpc("aggregate_all_hourly_stats_for_date", {
					p_ride_id: ride.id,
					p_date: targetDate,
				});

				if (error) {
					console.error(`Error aggregating all hours for ${ride.name}:`, error);
					errorCount++;
				} else {
					console.log(`✅ Aggregated all hours for ${ride.name}`);
					successCount++;
				}
			}
		} catch (error) {
			console.error(`Exception processing ${ride.name}:`, error);
			errorCount++;
		}
	}

	return {
		success: true,
		date: targetDate,
		hour: mode === "single" ? targetHour : "all",
		mode: mode,
		totalRides: rides.length,
		successCount,
		errorCount,
		message: mode === "single" ? `Hourly aggregation completed for ${targetDate} hour ${targetHour}` : `Daily aggregation completed for ${targetDate}`,
	};
}
