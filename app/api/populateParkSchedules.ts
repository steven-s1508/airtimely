import { supabase } from "@/src/utils/supabase";

interface ApiScheduleEntry {
	date: string;
	type: "OPERATING" | "INFO" | "TICKETED_EVENT";
	openingTime?: string;
	closingTime?: string;
	description?: string;
	purchases?: Array<{
		id: string;
		name: string;
		type: string;
		price: {
			amount: number;
			currency: string;
			formatted: string;
		};
		available?: boolean;
	}>;
}

interface ApiScheduleResponse {
	id: string;
	name: string;
	entityType: string;
	timezone: string;
	schedule: ApiScheduleEntry[];
}

async function fetchScheduleFromApi(parkId: string): Promise<ApiScheduleResponse | null> {
	try {
		const response = await fetch(`https://api.themeparks.wiki/v1/entity/${parkId}/schedule`);
		if (!response.ok) {
			console.error(`Failed to fetch park schedule: ${response.status}`);
			return null;
		}
		return await response.json();
	} catch (error) {
		console.error("Error fetching park schedule:", error);
		return null;
	}
}

export async function populateParkSchedules(): Promise<void> {
	try {
		// Get all active parks with external IDs
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, external_id, name").eq("is_active", true).not("external_id", "is", null);

		if (parksError) {
			console.error("Error fetching parks:", parksError);
			return;
		}

		console.log(`Found ${parks?.length || 0} parks to update schedules for`);

		for (const park of parks || []) {
			console.log(`Fetching schedule for park: ${park.name}`);

			const apiSchedule = await fetchScheduleFromApi(park.external_id);
			if (!apiSchedule?.schedule) {
				console.log(`No schedule data for park: ${park.name}`);
				continue;
			}

			// Transform and insert schedule data
			const scheduleEntries = apiSchedule.schedule.map((entry) => ({
				park_id: park.id,
				date: entry.date,
				type: entry.type,
				opening_time: entry.openingTime || null,
				closing_time: entry.closingTime || null,
				description: entry.description || null,
				purchases: entry.purchases ? JSON.stringify(entry.purchases) : null,
			}));

			if (scheduleEntries.length > 0) {
				// Delete existing schedule entries for this park (for the dates we're updating)
				const dates = [...new Set(scheduleEntries.map((e) => e.date))];
				for (const date of dates) {
					await supabase.from("parks_schedule").delete().eq("park_id", park.id).eq("date", date);
				}

				// Insert new schedule entries
				const { error: insertError } = await supabase.from("parks_schedule").insert(scheduleEntries);

				if (insertError) {
					console.error(`Error inserting schedule for ${park.name}:`, insertError);
				} else {
					console.log(`✅ Updated schedule for ${park.name} (${scheduleEntries.length} entries)`);
				}
			}

			// Rate limiting
			await new Promise((resolve) => setTimeout(resolve, 210));
		}

		console.log("Park schedule population completed");
	} catch (error) {
		console.error("Error in populateParkSchedules:", error);
	}
}

export default populateParkSchedules;
