import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SELFHOST_SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SELFHOST_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
serve(async (req) => {
	try {
		const url = new URL(req.url);
		const year = parseInt(url.searchParams.get("year") || new Date().getFullYear().toString());
		const month = parseInt(url.searchParams.get("month") || (new Date().getMonth() + 1).toString());
		console.log(`Starting monthly aggregation for ${year}-${month}`);
		// Get all active rides
		const { data: rides, error: ridesError } = await supabase.from("rides").select("id, name").eq("is_active", true);
		if (ridesError) {
			throw new Error(`Error fetching rides: ${ridesError.message}`);
		}
		let successCount = 0;
		let errorCount = 0;
		// Process each ride
		for (const ride of rides) {
			try {
				// Call the PostgreSQL aggregation function
				const { error } = await supabase.rpc("aggregate_monthly_ride_stats", {
					p_ride_id: ride.id,
					p_year: year,
					p_month: month,
				});
				if (error) {
					console.error(`Error aggregating monthly stats for ${ride.name}:`, error);
					errorCount++;
				} else {
					console.log(`✅ Aggregated monthly stats for ${ride.name}`);
					successCount++;
				}
			} catch (error) {
				console.error(`Exception processing monthly stats for ${ride.name}:`, error);
				errorCount++;
			}
		}
		return new Response(
			JSON.stringify({
				success: true,
				year,
				month,
				totalRides: rides.length,
				successCount,
				errorCount,
				message: `Monthly aggregation completed for ${year}-${month}`,
			}),
			{
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	} catch (error) {
		console.error("Monthly aggregation error:", error);
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
