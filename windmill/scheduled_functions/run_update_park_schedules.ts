// Windmill Script: Update Park Schedules
// Language: TypeScript (Deno)
// Description: Fetch and update park schedules from ThemeParks API

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ThemeParks API configuration
const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";
const THEMEPARKS_API_REQUEST_DELAY_MS = 210;

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEntitySchedule(entityID: string) {
	const url = `${THEMEPARKS_API_BASE_URL}/entity/${entityID}/schedule`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to fetch schedule for ${entityID}: ${response.statusText}`);
			return null;
		}
		return await response.json();
	} catch (error) {
		console.error(`Network error fetching schedule for ${entityID}:`, error);
		return null;
	}
}

async function updateParkSchedules(supabase: any) {
	console.log("Starting park schedules update...");
	try {
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, external_id, name").eq("is_active", true).not("external_id", "is", null);

		if (parksError) {
			console.error("Error fetching parks:", parksError);
			throw new Error("Error fetching parks");
		}

		if (!parks || parks.length === 0) {
			return {
				success: true,
				message: "No active parks found",
				parksProcessed: 0,
				successfulParks: 0,
				failedParks: 0,
				entriesInserted: 0,
			};
		}

		console.log(`Found ${parks.length} parks to update schedules for`);

		let successfulParks = 0;
		let failedParks = 0;
		let totalEntriesInserted = 0;

		// Process each park individually
		for (const park of parks) {
			console.log(`Fetching schedule for park: ${park.name}`);
			try {
				const scheduleResponse = await fetchEntitySchedule(park.external_id);

				if (scheduleResponse?.schedule && scheduleResponse.schedule.length > 0) {
					// Prepare schedule entries for this park
					const scheduleEntries = scheduleResponse.schedule.map((entry: any) => ({
						park_id: park.id,
						date: entry.date,
						type: entry.type,
						opening_time: entry.openingTime || null,
						closing_time: entry.closingTime || null,
						description: entry.description || null,
						purchases: entry.purchases || null,
					}));

					// Get unique dates for this park's schedule
					const dates = [...new Set(scheduleEntries.map((e) => e.date))];

					// Delete existing entries for these specific dates and park
					for (const date of dates) {
						const { error: deleteError } = await supabase.from("parks_schedule").delete().eq("park_id", park.id).eq("date", date);

						if (deleteError) {
							console.error(`Error deleting old entries for ${park.name} on ${date}:`, deleteError);
						}
					}

					// Insert new entries for this park
					const { error: insertError } = await supabase.from("parks_schedule").insert(scheduleEntries);

					if (insertError) {
						console.error(`Error inserting schedule for ${park.name}:`, insertError);
						failedParks++;
					} else {
						console.log(`✅ Updated schedule for ${park.name} (${scheduleEntries.length} entries)`);
						successfulParks++;
						totalEntriesInserted += scheduleEntries.length;
					}
				} else {
					console.warn(`No schedule found for park: ${park.name}`);
					// Don't count as failed if API returns empty but valid response
					successfulParks++;
				}

				await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
			} catch (error) {
				console.error(`Error processing park ${park.name}:`, error);
				failedParks++;
			}
		}

		return {
			success: true,
			parksProcessed: parks.length,
			successfulParks,
			failedParks,
			entriesInserted: totalEntriesInserted,
		};
	} catch (error) {
		console.error("Error in updateParkSchedules:", error);
		throw error;
	}
}

export async function main() {
	// Get environment variables (Windmill provides these)
	const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	try {
		const result = await updateParkSchedules(supabase);
		return result;
	} catch (error) {
		console.error("Script error:", error);
		throw error;
	}
}
