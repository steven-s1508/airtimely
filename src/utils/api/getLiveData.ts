import { supabase } from "@/src/utils/supabase";
import { fetchEntityLiveData } from "../themeparksApi";
import type { Tables, TablesInsert } from "@/src/types/database.types";
import type { EntityLiveData } from "@/src/types/themeparksWikiApi/entityLive";
import { randomUUID } from "expo-crypto";

const THEMEPARKS_API_REQUEST_DELAY_MS = 210; // Respect rate limits

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches live data for all active rides, shows, and restaurants
 * and stores the wait times in the historical data table
 */
export async function updateAllLiveData(): Promise<void> {
	console.log("Starting live data update process...");
	const timestamp = new Date().toISOString();

	try {
		// Get all active parks with their external IDs
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, external_id, name").eq("is_active", true).not("external_id", "is", null);

		if (parksError) {
			console.error("Error fetching parks:", parksError);
			return;
		}

		if (!parks || parks.length === 0) {
			console.log("No active parks found.");
			return;
		}

		console.log(`Found ${parks.length} active parks to update.`);

		for (const park of parks) {
			await updateParkLiveData(park, timestamp);
			await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
		}

		console.log("Live data update process completed.");
	} catch (error) {
		console.error("Error in updateAllLiveData:", error);
	}
}

/**
 * Updates live data for a specific park
 */
async function updateParkLiveData(park: { id: string; external_id: string | null; name: string }, timestamp: string): Promise<void> {
	if (!park.external_id) {
		console.warn(`Skipping park ${park.name} - no external_id`);
		return;
	}

	console.log(`Fetching live data for park: ${park.name}`);

	try {
		// Fetch live data from ThemeParks API
		const liveData = await fetchEntityLiveData(park.external_id);

		if (!liveData?.liveData || liveData.liveData.length === 0) {
			console.log(`No live data available for park: ${park.name}`);
			return;
		}

		// Get all rides for this park to match with live data
		const { data: rides, error: ridesError } = await supabase.from("rides").select("id, external_id, name").eq("park_id", park.id).eq("is_active", true);

		if (ridesError) {
			console.error(`Error fetching rides for park ${park.name}:`, ridesError);
			return;
		}

		if (!rides || rides.length === 0) {
			console.log(`No rides found for park: ${park.name}`);
			return;
		}

		// Process each live data entry
		const waitTimeEntries: TablesInsert<"ride_wait_times">[] = [];

		for (const entityLive of liveData.liveData) {
			// Find the corresponding ride in our database
			const ride = rides.find((r) => r.external_id === entityLive.id);

			if (!ride) {
				console.log(`Ride not found in database for external_id: ${entityLive.id}`);
				continue;
			}

			// Extract wait time data
			const waitTime = entityLive.queue?.STANDBY?.waitTime ?? null;
			const singleRiderWaitTime = entityLive.queue?.SINGLE_RIDER?.waitTime ?? null;
			const status = entityLive.status ?? null;

			// Create wait time entry
			const waitTimeEntry: TablesInsert<"ride_wait_times"> = {
				id: randomUUID(),
				ride_id: ride.id,
				recorded_at_timestamp: timestamp,
				wait_time_minutes: waitTime,
				single_rider_wait_time_minutes: singleRiderWaitTime,
				status: status,
				api_last_updated: entityLive.lastUpdated,
				raw_live_data: entityLive as any, // Store full API response
				showtimes_json: entityLive.showtimes || null,
			};

			waitTimeEntries.push(waitTimeEntry);
		}

		// Insert all wait time entries for this park
		if (waitTimeEntries.length > 0) {
			const { error: insertError } = await supabase.from("ride_wait_times").insert(waitTimeEntries);

			if (insertError) {
				console.error(`Error inserting wait times for park ${park.name}:`, insertError);
			} else {
				console.log(`Successfully inserted ${waitTimeEntries.length} wait time entries for park: ${park.name}`);
			}
		}
	} catch (error) {
		console.error(`Error updating live data for park ${park.name}:`, error);
	}
}

/**
 * Clean up old wait time data (keep last 30 days)
 */
export async function cleanupOldWaitTimes(): Promise<void> {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	try {
		const { error } = await supabase.from("ride_wait_times").delete().lt("recorded_at_timestamp", thirtyDaysAgo.toISOString());

		if (error) {
			console.error("Error cleaning up old wait times:", error);
		} else {
			console.log("Successfully cleaned up old wait time data");
		}
	} catch (error) {
		console.error("Error in cleanupOldWaitTimes:", error);
	}
}

// If this script is run directly, execute the update
if (require.main === module) {
	updateAllLiveData()
		.then(() => console.log("Live data update script finished."))
		.catch((error) => console.error("Live data update script failed:", error));
}

export default updateAllLiveData;
