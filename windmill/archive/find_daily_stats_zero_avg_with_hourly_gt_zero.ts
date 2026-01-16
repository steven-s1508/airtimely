// Windmill function: Calls Supabase RPC to find daily_ride_statistics with avg_wait_time_minutes = 0 and any hourly_data.avg > 0

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main() {
	// Get environment variables (Windmill provides these)
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// Call the custom SQL function via RPC
	const { data, error } = await supabase.rpc("find_daily_stats_zero_avg_with_hourly_gt_zero");

	if (error) {
		throw new Error("Database query failed: " + error.message);
	}

	return data;
}
