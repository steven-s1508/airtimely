/* JUST FOR REFERENCE - THIS FUNCTION IS IN THE DATABASE */ import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SELFHOST_SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SELFHOST_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
serve(async (req) => {
	try {
		const url = new URL(req.url);
		//const targetDate = url.searchParams.get("date") || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
		const targetDate = "2025-06-12";
		const enableCleanup = url.searchParams.get("cleanup") !== "false"; // Default to true
		console.log(`Starting daily aggregation for ${targetDate}`);
		// Get all active rides
		const { data: rides, error: ridesError } = await supabase.from("rides").select("id, name").eq("is_active", true);
		if (ridesError) {
			throw new Error(`Error fetching rides: ${ridesError.message}`);
		}
		let successCount = 0;
		let errorCount = 0;
		let cleanupCount = 0;
		let cleanupNullCount = 0;
		// Process each ride
		for (const ride of rides) {
			try {
				// Process all 24 hours for this ride and date
				const { error } = await supabase.rpc("aggregate_daily_ride_stats", {
					p_ride_id: ride.id,
					p_date: targetDate,
				});
				if (error) {
					console.error(`Error aggregating hourly stats for ${ride.name}:`, error);
					errorCount++;
				} else {
					console.log(`✅ Aggregated hourly stats for ${ride.name}`);
					successCount++;
				}
			} catch (error) {
				console.error(`Exception processing hourly stats for ${ride.name}:`, error);
				errorCount++;
			}
		}
		// If aggregation was successful for most rides, clean up raw data
		if (enableCleanup && successCount > 0 && errorCount === 0) {
			console.log(`Starting cleanup of raw data for ${targetDate}...`);
			const startOfDay = new Date(targetDate + "T00:00:00");
			const endOfDay = new Date(targetDate + "T23:59:59");
			const { error: cleanupError, cleanupCount } = await supabase.from("ride_wait_times").delete().gte("recorded_at_local", startOfDay.toISOString()).lte("recorded_at_local", endOfDay.toISOString());
			const { error: cleanupErrorNull, cleanupNullCount } = await supabase.from("ride_wait_times").delete().is("recorded_at_local", null);
			if (cleanupError || cleanupErrorNull) {
				const errorMessage = (cleanupError ? cleanupError : "") + (cleanupErrorNull ? cleanupErrorNull : "");
				console.error("Error cleaning up raw data:", errorMessage);
			} else {
				console.log(`✅ Cleaned up ${cleanupCount} raw data records for ${targetDate}`);
				console.log(`✅ Cleaned up ${cleanupNullCount} raw data records with null record`);
			}
		} else if (errorCount > 0) {
			console.log(`Skipping cleanup due to ${errorCount} aggregation errors`);
		}
		return new Response(
			JSON.stringify({
				success: true,
				date: targetDate,
				totalRides: rides.length,
				successCount,
				errorCount,
				cleanupCount,
				cleanupNullCount,
				message: `Hourly aggregation completed for ${targetDate}`,
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
