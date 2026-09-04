import type { Tables } from "@src/types/supabase";
import { supabase } from "@src/utils/supabase";

export type DisplayableEntity = Tables<"displayable_destinations">;

export async function fetchDisplayableEntities(): Promise<DisplayableEntity[]> {
	const { data, error } = await supabase
		.from("displayable_destinations")
		.select(`
            entity_id,
            name,
            entity_type,
            country_code,
            original_destination_id
        `);

	if (error) {
		console.error("Error fetching displayable entities:", error);
		return [];
	}

	if (!Array.isArray(data)) {
		console.error("Fetched data is not an array:", data);
		return [];
	}

	return data.sort((a, b) => (a.name || "").localeCompare(b.name || "")) as DisplayableEntity[];
}