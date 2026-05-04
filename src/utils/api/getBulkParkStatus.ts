import { supabase } from "@/src/utils/supabase";
import { DateTime } from "luxon";
import type { ParkStatus } from "./getParkStatus";

/**
 * Fetches the status for multiple parks in a single optimized database call.
 * 
 * @param parkIds Array of park IDs to fetch status for.
 * @returns A promise that resolves to a record mapping park ID to its status.
 */
export async function getBulkParkStatus(parkIds: string[]): Promise<Record<string, ParkStatus>> {
	if (!parkIds || parkIds.length === 0) {
		return {};
	}

	try {
		// 1. Fetch timezones for all parks in one go
		const { data: parks, error: parksError } = await supabase
			.from("parks")
			.select("id, timezone")
			.in("id", parkIds);

		if (parksError) {
			console.error("Error fetching timezones for bulk status:", parksError);
			return parkIds.reduce((acc, id) => ({ ...acc, [id]: "Unknown" }), {});
		}

		// 2. Group parks by their "today" date based on their timezone
		const dateToParkIds: Record<string, string[]> = {};
		const parkIdToTimezone: Record<string, string> = {};

		parks?.forEach((park) => {
			const timezone = park.timezone || "UTC";
			const todayString = DateTime.now().setZone(timezone).toISODate(); // YYYY-MM-DD
			if (todayString) {
				if (!dateToParkIds[todayString]) {
					dateToParkIds[todayString] = [];
				}
				dateToParkIds[todayString].push(park.id);
				parkIdToTimezone[park.id] = timezone;
			}
		});

		const uniqueDates = Object.keys(dateToParkIds);
		if (uniqueDates.length === 0) {
			return parkIds.reduce((acc, id) => ({ ...acc, [id]: "Closed" }), {});
		}

		// 3. Fetch operating hours for all parks and relevant dates in one go
		const { data: operatingHours, error: hoursError } = await supabase
			.from("park_operating_hours")
			.select("park_id, date, opening_time, closing_time")
			.in("park_id", parkIds)
			.in("date", uniqueDates);

		if (hoursError) {
			console.error("Error fetching operating hours for bulk status:", hoursError);
			return parkIds.reduce((acc, id) => ({ ...acc, [id]: "Unknown" }), {});
		}

		// 4. Determine status for each park
		const results: Record<string, ParkStatus> = {};

		parkIds.forEach((parkId) => {
			const timezone = parkIdToTimezone[parkId] || "UTC";
			const now = DateTime.now().setZone(timezone);
			const todayJS = now.toJSDate();
			const todayString = now.toISODate();

			const hoursForPark = operatingHours?.filter(
				(h) => h.park_id === parkId && h.date === todayString
			) || [];

			if (hoursForPark.length === 0) {
				results[parkId] = "Closed";
			} else {
				let isOpen = false;
				for (const hours of hoursForPark) {
					if (hours.opening_time && hours.closing_time) {
						const openTime = new Date(hours.opening_time);
						const closeTime = new Date(hours.closing_time);

						if (todayJS >= openTime && todayJS <= closeTime) {
							isOpen = true;
							break;
						}
					}
				}
				results[parkId] = isOpen ? "Open" : "Closed";
			}
		});

		return results;
	} catch (error) {
		console.error("Unexpected error in getBulkParkStatus:", error);
		return parkIds.reduce((acc, id) => ({ ...acc, [id]: "Unknown" }), {});
	}
}
