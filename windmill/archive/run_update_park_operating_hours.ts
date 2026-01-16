// Windmill Script: Update Park Operating Hours
// Language: TypeScript (Deno)
// Description: Fetch and update park operating hours from ThemeParks API

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

async function updateParkOperatingHours(supabase: any) {
	console.log("Starting park operating hours update...");
	try {
		// Get all active parks with external IDs
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, external_id, name, timezone").eq("is_active", true).not("external_id", "is", null);

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
				hoursInserted: 0,
			};
		}

		console.log(`Found ${parks.length} parks to update`);

		const parkHoursToInsert = [];
		let successfulParks = 0;
		let failedParks = 0;

		// Fetch schedule for each park
		for (const park of parks) {
			console.log(`Fetching schedule for park: ${park.name}`);
			try {
				const scheduleResponse = await fetchEntitySchedule(park.external_id);
				if (scheduleResponse?.schedule) {
					// Process schedule entries
					for (const entry of scheduleResponse.schedule) {
						let dateStr;
						// Extract date from the schedule entry
						if (entry.openingTime) {
							dateStr = entry.openingTime.substring(0, 10);
						} else if (entry.closingTime) {
							dateStr = entry.closingTime.substring(0, 10);
						} else if (entry.date) {
							dateStr = entry.date;
						}

						if (dateStr && entry.type) {
							parkHoursToInsert.push({
								park_id: park.id,
								date: dateStr,
								opening_time: entry.openingTime || null,
								closing_time: entry.closingTime || null,
								type: entry.type,
							});
						}
					}
					successfulParks++;
				} else {
					console.warn(`No schedule found for park: ${park.name}`);
					failedParks++;
				}

				await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
			} catch (error) {
				console.error(`Error processing park ${park.name}:`, error);
				failedParks++;
			}
		}

		// Update database with new schedule data
		if (parkHoursToInsert.length > 0) {
			console.log(`Inserting ${parkHoursToInsert.length} park operating hours...`);

			// Delete existing hours for the parks and dates we're updating
			const distinctParkDatePairs = Array.from(new Set(parkHoursToInsert.map((ph) => `${ph.park_id}|${ph.date}`)));

			for (const pair of distinctParkDatePairs) {
				const [parkId, date] = pair.split("|");
				const { error: deleteError } = await supabase.from("park_operating_hours").delete().eq("park_id", parkId).eq("date", date);

				if (deleteError) {
					console.error(`Error deleting old schedule for park ${parkId} on ${date}:`, deleteError);
				}
			}

			// Insert new hours
			const { error: insertError } = await supabase.from("park_operating_hours").insert(parkHoursToInsert);

			if (insertError) {
				console.error("Error inserting park operating hours:", insertError);
				throw new Error("Database insert failed");
			}

			console.log(`✅ Successfully inserted ${parkHoursToInsert.length} park operating hours`);
		}

		return {
			success: true,
			parksProcessed: parks.length,
			successfulParks,
			failedParks,
			hoursInserted: parkHoursToInsert.length,
		};
	} catch (error) {
		console.error("Error in updateParkOperatingHours:", error);
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

	// Initialize Supabase client
	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	try {
		const result = await updateParkOperatingHours(supabase);
		return result;
	} catch (error) {
		console.error("Script error:", error);
		throw error;
	}
}
