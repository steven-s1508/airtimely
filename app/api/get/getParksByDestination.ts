import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/database.types";

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
