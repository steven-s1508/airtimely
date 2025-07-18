// Windmill Script: Update Live Data
// Language: TypeScript (Deno)
// Description: Fetch and update live ride wait time data from ThemeParks API

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ThemeParks API configuration
const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";
const THEMEPARKS_API_REQUEST_DELAY_MS = 210;

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEntityLiveData(entityID: string) {
	const url = `${THEMEPARKS_API_BASE_URL}/entity/${entityID}/live`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to fetch live data for ${entityID}: ${response.statusText}`);
			return null;
		}
		return await response.json();
	} catch (error) {
		console.error(`Network error fetching live data for ${entityID}:`, error);
		return null;
	}
}

async function generateUUID() {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	// Set version (4) and variant bits
	array[6] = (array[6] & 0x0f) | 0x40;
	array[8] = (array[8] & 0x3f) | 0x80;
	const hex = Array.from(array)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Helper function to convert UTC to park timezone
function convertToTimezone(utcTimestamp: string, timezone: string) {
	try {
		const date = new Date(utcTimestamp);
		// Use Intl.DateTimeFormat to convert to local timezone
		const localDate = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		}).formatToParts(date);
		// Reconstruct ISO-like string for the local timezone
		const year = localDate.find((p) => p.type === "year")?.value;
		const month = localDate.find((p) => p.type === "month")?.value;
		const day = localDate.find((p) => p.type === "day")?.value;
		const hour = localDate.find((p) => p.type === "hour")?.value;
		const minute = localDate.find((p) => p.type === "minute")?.value;
		const second = localDate.find((p) => p.type === "second")?.value;
		return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
	} catch (error) {
		console.error(`Error converting timezone for ${timezone}:`, error);
		return utcTimestamp; // Fallback to UTC
	}
}

async function updateParkLiveData(park: any, timestamp: string, supabase: any) {
	console.log(`Fetching live data for park: ${park.name} (${park.timezone || "UTC"})`);
	try {
		// Fetch live data from ThemeParks API
		const liveData = await fetchEntityLiveData(park.external_id);
		if (!liveData?.liveData || liveData.liveData.length === 0) {
			console.log(`No live data available for park: ${park.name}`);
			return {
				success: false,
				reason: "No live data available",
			};
		}

		// Get all rides for this park
		const { data: rides, error: ridesError } = await supabase.from("rides").select("id, external_id, name").eq("park_id", park.id).eq("is_active", true);

		if (ridesError) {
			console.error(`Error fetching rides for park ${park.name}:`, ridesError);
			return {
				success: false,
				reason: "Database error fetching rides",
			};
		}

		if (!rides || rides.length === 0) {
			console.log(`No rides found for park: ${park.name}`);
			return {
				success: false,
				reason: "No rides found",
			};
		}

		// Calculate local timestamp for this park
		const localTimestamp = park.timezone ? convertToTimezone(timestamp, park.timezone) : timestamp;

		// Create records for ALL rides, even those without current live data
		const waitTimeEntries = [];

		// Process each ride in our database
		for (const ride of rides) {
			let waitTimeEntry;
			if (ride.external_id) {
				// Find corresponding live data for this ride
				const rideLiveData = liveData.liveData.find((entity: any) => entity.id === ride.external_id);
				if (rideLiveData) {
					// Create entry with live data
					waitTimeEntry = {
						id: await generateUUID(),
						ride_id: ride.id,
						recorded_at_timestamp: timestamp,
						recorded_at_local: localTimestamp,
						wait_time_minutes: rideLiveData.queue?.STANDBY?.waitTime ?? null,
						single_rider_wait_time_minutes: rideLiveData.queue?.SINGLE_RIDER?.waitTime ?? null,
						status: rideLiveData.status ?? "UNKNOWN",
						api_last_updated: rideLiveData.lastUpdated || timestamp,
						raw_live_data: rideLiveData,
						showtimes_json: rideLiveData.showtimes || null,
					};
				} else {
					// Create entry for rides that exist but have no current live data
					waitTimeEntry = {
						id: await generateUUID(),
						ride_id: ride.id,
						recorded_at_timestamp: timestamp,
						recorded_at_local: localTimestamp,
						wait_time_minutes: null,
						single_rider_wait_time_minutes: null,
						status: "NO_DATA",
						api_last_updated: timestamp,
						raw_live_data: null,
						showtimes_json: null,
					};
				}
			} else {
				// Create entry for rides without external_id
				waitTimeEntry = {
					id: await generateUUID(),
					ride_id: ride.id,
					recorded_at_timestamp: timestamp,
					recorded_at_local: localTimestamp,
					wait_time_minutes: null,
					single_rider_wait_time_minutes: null,
					status: "NO_EXTERNAL_ID",
					api_last_updated: timestamp,
					raw_live_data: null,
					showtimes_json: null,
				};
			}
			waitTimeEntries.push(waitTimeEntry);
		}

		// Bulk insert all wait time entries for this park
		if (waitTimeEntries.length > 0) {
			console.log(`Inserting ${waitTimeEntries.length} wait time records for ${park.name}...`);
			const { error: insertError } = await supabase.from("ride_wait_times").insert(waitTimeEntries);

			if (insertError) {
				console.error(`Error inserting wait times for park ${park.name}:`, insertError);
				return {
					success: false,
					reason: "Database insert error",
					error: insertError,
				};
			} else {
				console.log(`✅ Successfully inserted ${waitTimeEntries.length} wait time entries for park: ${park.name}`);
				return {
					success: true,
					recordsInserted: waitTimeEntries.length,
					withLiveData: waitTimeEntries.filter((e) => e.raw_live_data !== null).length,
				};
			}
		}

		return {
			success: true,
			recordsInserted: 0,
		};
	} catch (error) {
		console.error(`Error updating live data for park ${park.name}:`, error);
		return {
			success: false,
			reason: "Exception occurred",
			error: error.message,
		};
	}
}

async function updateAllLiveData(supabase: any) {
	console.log("Starting live data update process...");
	const timestamp = new Date().toISOString();

	try {
		// Get all active parks with their external IDs and timezones
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, external_id, name, timezone").eq("is_active", true).not("external_id", "is", null);

		if (parksError) {
			console.error("Error fetching parks:", parksError);
			throw new Error("Error fetching parks");
		}

		if (!parks || parks.length === 0) {
			console.log("No active parks found.");
			return {
				message: "No active parks found",
				success: true,
				parksProcessed: 0,
				successfulParks: 0,
				failedParks: 0,
				totalRecordsInserted: 0,
				totalWithLiveData: 0,
			};
		}

		console.log(`Found ${parks.length} active parks to update.`);

		let totalRecordsInserted = 0;
		let totalWithLiveData = 0;
		let successfulParks = 0;
		let failedParks = 0;

		// Process each park
		for (const park of parks) {
			const result = await updateParkLiveData(park, timestamp, supabase);
			if (result.success) {
				successfulParks++;
				totalRecordsInserted += result.recordsInserted || 0;
				totalWithLiveData += result.withLiveData || 0;
			} else {
				failedParks++;
				console.error(`Failed to update park ${park.name}: ${result.reason}`);
			}

			// Rate limiting
			await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
		}

		console.log("Live data update process completed.");
		console.log(`Summary: ${successfulParks} successful, ${failedParks} failed`);
		console.log(`Total records inserted: ${totalRecordsInserted} (${totalWithLiveData} with live data)`);

		return {
			success: true,
			timestamp,
			parksProcessed: parks.length,
			successfulParks,
			failedParks,
			totalRecordsInserted,
			totalWithLiveData,
		};
	} catch (error) {
		console.error("Error in updateAllLiveData:", error);
		throw error;
	}
}

// Optional: Clean up old data periodically
async function cleanupOldData(supabase: any) {
	try {
		// Keep detailed data for 90 days, then rely on aggregated data
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - 90);

		const { error } = await supabase.from("ride_wait_times").delete().lt("recorded_at_timestamp", cutoffDate.toISOString());

		if (error) {
			console.error("Error cleaning up old data:", error);
			throw new Error("Error cleaning up old data");
		} else {
			console.log("Successfully cleaned up old wait time data");
			return {
				success: true,
				message: "Cleanup completed",
			};
		}
	} catch (error) {
		console.error("Error in cleanup process:", error);
		throw error;
	}
}

export async function main(cleanup: boolean = false) {
	// Get environment variables (Windmill provides these)
	const supabaseUrl = await await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
	const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
	}

	// Initialize Supabase client
	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	try {
		let result;
		if (cleanup) {
			result = await cleanupOldData(supabase);
		} else {
			result = await updateAllLiveData(supabase);
		}

		return result;
	} catch (error) {
		console.error("Script error:", error);
		throw error;
	}
}
