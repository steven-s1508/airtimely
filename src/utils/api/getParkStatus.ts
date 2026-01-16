import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/supabase";
import { DateTime } from "luxon";
import getParkTimezone from "@/src/utils/helpers/getParkTimezone";
import { getBulkParkStatus } from "./getBulkParkStatus";

export type ParkStatus = "Open" | "Closed" | "Unknown";

export interface ParkWithStatus extends Tables<"parks"> {
	status: ParkStatus;
}

/**
 * Determines if a park is currently open based on operating hours
 */
export async function getParkStatus(parkId: string): Promise<ParkStatus> {
	if (!parkId) {
		console.error(`Invalid park ID: ${parkId}`);
		return "Unknown";
	}

	const timezone = await getParkTimezone(parkId);
	const todayString = DateTime.now().setZone(timezone).toISODate();
	const today = DateTime.now().setZone(timezone).toJSDate();

	try {
		// Get today's operating hours for the park
		const { data: operatingHours, error } = await supabase.from("park_operating_hours").select("opening_time, closing_time").eq("park_id", parkId).eq("date", todayString!).order("opening_time", { ascending: true });

		if (error) {
			console.error(`Error fetching operating hours for park ${parkId}:`, error);
			return "Unknown";
		}

		if (!operatingHours || operatingHours.length === 0) {
			return "Closed"; // No operating hours means closed
		}

		// Check if current time falls within any operating period
		for (const hours of operatingHours) {
			if (hours.opening_time && hours.closing_time) {
				const openTime = new Date(hours.opening_time);
				const closeTime = new Date(hours.closing_time);

				if (today >= openTime && today <= closeTime) {
					return "Open";
				}
			}
		}

		return "Closed";
	} catch (error) {
		console.error(`Error checking park status for ${parkId}:`, error);
		return "Unknown";
	}
}

/**
 * Gets status for multiple parks and determines destination status
 */
export async function getDestinationStatus(parks: Tables<"parks">[]): Promise<ParkStatus> {
	if (parks.length === 0) return "Unknown";

	if (parks.length === 1) {
		// Single park destination
		return await getParkStatus(parks[0].id);
	}

	// Multiple parks - destination is open if at least one park is open
	const parkIds = parks.map((park) => park.id);
	const statusesMap = await getBulkParkStatus(parkIds);
	const statuses = Object.values(statusesMap);

	// If any park is open, destination is open
	if (statuses.includes("Open")) return "Open";

	// If all parks have known status and none are open, destination is closed
	if (statuses.every((status) => status === "Closed")) return "Closed";

	// Otherwise unknown (some parks have unknown status)
	return "Unknown";
}

/**
 * Gets parks with their individual statuses
 */
export async function getParksWithStatus(parks: Tables<"parks">[]): Promise<ParkWithStatus[]> {
	const parkIds = parks.map((park) => park.id);
	const statusesMap = await getBulkParkStatus(parkIds);

	return parks.map((park) => ({
		...park,
		status: statusesMap[park.id] || "Unknown",
	}));
}
