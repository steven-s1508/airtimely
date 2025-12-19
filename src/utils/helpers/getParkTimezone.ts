import { supabase } from "@/src/utils/supabase";

/**
 * Fetches the timezone for a given park ID from the database.
 * @param parkId The ID of the park.
 * @returns A promise that resolves to the timezone string (e.g., "America/New_York") or null if not found or an error occurs.
 */
export default async function getParkTimezone(parkId: string): Promise<string> {
	try {
		const { data, error } = await supabase.from("parks").select("timezone").eq("id", parkId).single();

		if (error || !data) {
			console.error(`Error fetching timezone for park ${parkId}:`, error);
			return "UTC"; // Fallback to null or a default like "UTC" if preferred
		}
		return data.timezone || "UTC"; // Ensure a default timezone if null in DB
	} catch (error) {
		console.error(`Unexpected error fetching timezone for park ${parkId}:`, error);
		return "UTC";
	}
}
