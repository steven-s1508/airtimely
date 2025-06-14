import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";
const THEMEPARKS_API_REQUEST_DELAY_MS = 210;
const supabaseUrl = Deno.env.get("SELFHOST_SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SELFHOST_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
async function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchEntitySchedule(entityID) {
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
async function updateParkOperatingHours() {
	console.log("Starting park operating hours update...");
	try {
		// Get all active parks with external IDs
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, external_id, name, timezone").eq("is_active", true).not("external_id", "is", null);
		if (parksError) {
			console.error("Error fetching parks:", parksError);
			return {
				error: "Error fetching parks",
			};
		}
		if (!parks || parks.length === 0) {
			return {
				message: "No active parks found",
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
				return {
					error: "Database insert failed",
				};
			}
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
		return {
			error: error.message,
		};
	}
}
serve(async (req) => {
	const authHeader = req.headers.get("Authorization");
	const expectedAuth = Deno.env.get("FUNCTION_SECRET");
	if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
		return new Response(
			JSON.stringify({
				error: "Unauthorized",
			}),
			{
				status: 401,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}
	try {
		const result = await updateParkOperatingHours();
		return new Response(JSON.stringify(result), {
			status: result.error ? 500 : 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
			},
		});
	} catch (error) {
		console.error("Edge function error:", error);
		return new Response(
			JSON.stringify({
				error: error.message,
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
