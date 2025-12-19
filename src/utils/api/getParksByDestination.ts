import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/supabase";

/**
 * Fetches parks associated with a specific destination.
 *
 * @param {string} destinationId - The ID of the destination to fetch parks for.
 * @returns {Promise<Tables<"parks">[]>} - A promise that resolves to an array of parks.
 */
export default async function getParksByDestination(destinationId: string): Promise<Tables<"parks">[]> {
	if (!destinationId) {
		return [];
	}
	const { data, error } = await supabase.from("parks").select("*").eq("destination_id", destinationId);

	if (error) {
		console.error(`Error fetching parks for destination ${destinationId}:`, error);
		return [];
	}
	return data || [];
}

/**
 * Fetches child parks associated with a specific destination.
 *
 * @param {string} destinationId - The ID of the destination to fetch child parks for.
 * @returns {Promise<Tables<"parks">[]>} - A promise that resolves to an array of child parks.
 */
export async function fetchChildParks(destinationId: string): Promise<Tables<"parks">[]> {
	if (!destinationId) {
		return [];
	}
	const { data, error } = await supabase.from("parks").select("*").eq("destination_id", destinationId).neq("is_destination", true); // Ensure we only get child parks, not those acting as their own destination

	if (error) {
		console.error(`Error fetching child parks for destination ${destinationId}:`, error);
		return [];
	}
	return data || [];
}
