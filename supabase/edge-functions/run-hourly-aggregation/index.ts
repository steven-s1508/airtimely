import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SELFHOST_SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SELFHOST_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
serve(async (req) => {
	try {
		const url = new URL(req.url);
		// Calculate previous hour automatically if not specified
		const now = new Date();
		const previousHour = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
		const targetDate = url.searchParams.get("date") || previousHour.toISOString().split("T")[0];
		const targetHour = url.searchParams.get("hour") ? parseInt(url.searchParams.get("hour")) : previousHour.getHours();
		const rideId = url.searchParams.get("ride_id"); // Process single ride if specified
		const mode = url.searchParams.get("mode") || "single"; // "single" or "all_day"
		console.log(`Starting hourly aggregation for ${targetDate} hour ${targetHour} (mode: ${mode})`);
		// Get rides to process
		let ridesQuery = supabase.from("rides").select("id, name").eq("is_active", true);
		if (rideId) {
			ridesQuery = ridesQuery.eq("id", rideId);
		}
		const { data: rides, error: ridesError } = await ridesQuery;
		if (ridesError) {
			throw new Error(`Error fetching rides: ${ridesError.message}`);
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
		return new Response(
			JSON.stringify({
				success: true,
				date: targetDate,
				hour: mode === "single" ? targetHour : "all",
				mode: mode,
				totalRides: rides.length,
				successCount,
				errorCount,
				message: mode === "single" ? `Hourly aggregation completed for ${targetDate} hour ${targetHour}` : `Daily aggregation completed for ${targetDate}`,
			}),
			{
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	} catch (error) {
		console.error("Hourly aggregation error:", error);
		return new Response(
			JSON.stringify({
				error: error.message,
				success: false,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}
});
