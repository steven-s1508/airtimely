import { supabase } from "@/src/utils/supabase";
import { DateTime } from "luxon";
import getParkTimezone from "./getParkTimezone"; // Assuming getParkTimezone is in the same directory

export interface ParkOperatingHours {
	opening_time: string | null;
	closing_time: string | null;
	timezone: string;
}

export default async function getParkOperatingHours(parkId: string, dateParam: string): Promise<{ openingTime: string; closingTime: string; timezone: string } | null> {
	try {
		const timezone = await getParkTimezone(parkId);
		if (!timezone) {
			console.error(`Could not determine timezone for park ${parkId}`);
			return null; // getParkTimezone already logs the error
		}

		let targetDate: DateTime;
		if (dateParam) {
			// If a date string is provided, parse it assuming it's already in the park's timezone
			// Luxon's fromISO with zone requires a non-null string.
			// If dateParam is an ISO string with timezone offset, Luxon might parse it correctly
			// even if the 'zone' option is not provided or is UTC.
			// We try to parse with the park's timezone first.
			const parsedDateWithZone = DateTime.fromISO(dateParam, { zone: timezone });
			if (parsedDateWithZone.isValid) {
				targetDate = parsedDateWithZone;
			} else {
				// Fallback: try parsing without explicit zone, assuming it's already in park's timezone or UTC
				const parsedDateFallback = DateTime.fromISO(dateParam);
				if (!parsedDateFallback.isValid) {
					console.error(`Invalid date provided: ${dateParam} even with fallback parsing.`);
					return null;
				}
				console.warn(`Date ${dateParam} did not parse with timezone ${timezone}. Using fallback parsing. Resulting date might be in UTC or original timezone of the string.`);
				targetDate = parsedDateFallback;
			}
		} else {
			// Otherwise, use the current date in the park's timezone
			targetDate = DateTime.now().setZone(timezone);
		}

		// Format the date as YYYY-MM-DD for the database query
		const queryDate = targetDate.toISODate();

		const { data, error } = await supabase.from("park_operating_hours").select("opening_time, closing_time").eq("park_id", parkId).eq("date", queryDate).eq("type", "OPERATING").order("created_at", { ascending: false }).limit(1).single();

		if (error || !data) {
			console.error(`Error fetching park operating hours for ${parkId} on ${queryDate}:`, error);
			return null;
		}

		const { opening_time: openingTime, closing_time: closingTime } = data;

		if (!openingTime || !closingTime) {
			// If specific opening/closing times are not found, but timezone is known.
			// This case might need specific business logic (e.g., park is closed).
			console.log(`Opening or closing time not found for park ${parkId} on ${queryDate}`);
			// Depending on requirements, you might return a default structure or null.
			// For now, returning null if times are not found.
			return null;
		}

		if (!timezone) {
			// Should have been caught earlier, but as a safeguard
			console.error(`Timezone is null for park ${parkId} after initial fetch.`);
			return null;
		}

		return {
			openingTime,
			closingTime,
			timezone: timezone as string, // Use the fetched timezone, type assertion as it's guarded by null checks
		};
	} catch (error) {
		console.error("Unexpected error fetching park operating hours:", error);
		return null;
	}
}
