import { supabase } from "@/src/utils/supabase";

interface ApiShowTime {
	type: string;
	startTime: string;
	endTime?: string | null;
}

interface ApiShowResponse {
	id: string;
	name: string;
	entityType: string;
	timezone: string;
	liveData: Array<{
		id: string;
		name: string;
		entityType: string;
		parkId: string;
		externalId: string;
		status: string;
		showtimes: ApiShowTime[];
		lastUpdated: string;
	}>;
}

async function fetchShowTimesFromApi(showId: string): Promise<ApiShowResponse | null> {
	try {
		const response = await fetch(`https://api.themeparks.wiki/v1/entity/${showId}/live`);
		if (!response.ok) {
			console.error(`Failed to fetch show times: ${response.status}`);
			return null;
		}
		return await response.json();
	} catch (error) {
		console.error("Error fetching show times:", error);
		return null;
	}
}

function extractDateFromTime(timeString: string): string {
	return timeString.split("T")[0];
}

export async function populateShowTimes(): Promise<void> {
	try {
		// Get all active shows with external IDs
		const { data: shows, error: showsError } = await supabase.from("shows").select("id, external_id, name").eq("is_active", true).eq("entity_type", "SHOW").not("external_id", "is", null);

		if (showsError) {
			console.error("Error fetching shows:", showsError);
			return;
		}

		console.log(`Found ${shows?.length || 0} shows to update times for`);

		for (const show of shows || []) {
			console.log(`Fetching show times for: ${show.name}`);

			const apiResponse = await fetchShowTimesFromApi(show.external_id);
			if (!apiResponse?.liveData?.[0]?.showtimes) {
				console.log(`No show times data for: ${show.name}`);
				continue;
			}

			const showData = apiResponse.liveData[0];

			// Transform and insert show times data
			const showTimeEntries = showData.showtimes.map((showtime) => ({
				show_id: show.id,
				date: extractDateFromTime(showtime.startTime),
				type: showtime.type || "Performance Time",
				start_time: showtime.startTime,
				end_time: showtime.endTime || null,
			}));

			if (showTimeEntries.length > 0) {
				// Delete existing show times for this show (for the dates we're updating)
				const dates = [...new Set(showTimeEntries.map((e) => e.date))];
				for (const date of dates) {
					await supabase.from("show_times").delete().eq("show_id", show.id).eq("date", date);
				}

				// Insert new show time entries
				const { error: insertError } = await supabase.from("show_times").insert(showTimeEntries);

				if (insertError) {
					console.error(`Error inserting show times for ${show.name}:`, insertError);
				} else {
					console.log(`✅ Updated show times for ${show.name} (${showTimeEntries.length} entries)`);
				}
			}

			// Rate limiting
			await new Promise((resolve) => setTimeout(resolve, 210));
		}

		console.log("Show times population completed");
	} catch (error) {
		console.error("Error in populateShowTimes:", error);
	}
}

export default populateShowTimes;
