import { supabase } from "@/src/utils/supabase";

export interface ShowTime {
	type: string;
	startTime: string;
	endTime?: string | null;
}

export interface ShowTimesResponse {
	id: string;
	name: string;
	entityType: string;
	timezone: string;
	showTimes: ShowTime[];
}

export async function getShowTimes(showId: string, date?: string): Promise<ShowTimesResponse | null> {
	try {
		const targetDate = date || new Date().toISOString().split("T")[0];

		// Get show info and times data
		const { data: showData, error: showError } = await supabase
			.from("shows")
			.select(
				`
                id,
                name,
                entity_type,
                show_times!inner(
                    date,
                    type,
                    start_time,
                    end_time
                )
            `
			)
			.eq("id", showId)
			.eq("show_times.date", targetDate)
			.eq("entity_type", "SHOW");

		if (showError) {
			console.error(`Failed to fetch show times from database: ${showError.message}`);
			return null;
		}

		if (!showData || showData.length === 0) {
			console.log(`No show times found for show ${showId} on ${targetDate}`);
			return null;
		}

		const show = showData[0];

		// Transform the data to match the expected interface
		const showTimes: ShowTime[] = show.show_times
			.map((item: any) => ({
				type: item.type,
				startTime: item.start_time,
				endTime: item.end_time,
			}))
			.sort((a: ShowTime, b: ShowTime) => a.startTime.localeCompare(b.startTime));

		return {
			id: show.id,
			name: show.name,
			entityType: show.entity_type,
			showTimes,
		};
	} catch (error) {
		console.error("Error fetching show times from database:", error);
		return null;
	}
}

// Function to get show times for a date range
export async function getShowTimesRange(showId: string, startDate: string, endDate: string): Promise<ShowTimesResponse | null> {
	try {
		const { data: showData, error: showError } = await supabase
			.from("shows")
			.select(
				`
                id,
                name,
                entity_type,
                show_times!inner(
                    date,
                    type,
                    start_time,
                    end_time
                )
            `
			)
			.eq("id", showId)
			.gte("show_times.date", startDate)
			.lte("show_times.date", endDate)
			.eq("entity_type", "SHOW")
			.order("show_times.start_time", { ascending: true });

		if (showError) {
			console.error(`Failed to fetch show times range: ${showError.message}`);
			return null;
		}

		if (!showData || showData.length === 0) {
			return null;
		}

		const show = showData[0];
		const showTimes: ShowTime[] = show.show_times.map((item: any) => ({
			type: item.type,
			startTime: item.start_time,
			endTime: item.end_time,
		}));

		return {
			id: show.id,
			name: show.name,
			entityType: show.entity_type,
			showTimes,
		};
	} catch (error) {
		console.error("Error fetching show times range:", error);
		return null;
	}
}
