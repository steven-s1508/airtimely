// Windmill Script: Retroactively fix daily_ride_statistics using hourly_data and corrected park hours logic
// Language: TypeScript (Deno)

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main(
	date?: string, // Format: YYYY-MM-DD
	ride_id?: string // UUID string
) {
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Build log message based on parameters
	let logMessage = "Starting retroactive fix of daily_ride_statistics using hourly_data";
	if (date) logMessage += ` for date ${date}`;
	if (ride_id) logMessage += ` for ride_id ${ride_id}`;
	console.log(logMessage + "...");

	try {
		// Call the database function to perform the retroactive fix with optional parameters
		const { data, error } = await supabase.rpc("retroactively_fix_daily_stats_from_hourly_data", {
			p_date: date ? date : null,
			p_ride_id: ride_id ? ride_id : null,
		});

		if (error) {
			throw new Error("Database function failed: " + error.message);
		}

		const result = data[0]; // RPC returns array with single object

		console.log(`Retroactive fix completed successfully:`);
		console.log(`- Processed records: ${result.processed_count}`);
		console.log(`- Updated records: ${result.updated_count}`);
		console.log(`- Errors: ${result.error_count}`);

		return {
			success: true,
			processed: result.processed_count,
			updated: result.updated_count,
			errors: result.error_count,
			message: `Successfully processed ${result.processed_count} records, updated ${result.updated_count}, with ${result.error_count} errors`,
		};
	} catch (error) {
		console.error("Retroactive fix failed:", error);
		throw new Error("Retroactive fix failed: " + error.message);
	}
}
