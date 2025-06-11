import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/database.types";

type Destination = Tables<"destinations">;
type Park = Tables<"parks">;

export default async function updateParkIsDestinationFlag() {
	console.log("Starting to update 'is_destination' flag for parks...");

	// 1. Fetch all destinations
	const { data: destinations, error: destError } = await supabase.from("destinations").select("id, name");

	if (destError) {
		console.error("Error fetching destinations:", destError.message);
		return;
	}

	if (!destinations || destinations.length === 0) {
		console.log("No destinations found to process.");
		return;
	}

	let parksUpdatedCount = 0;

	for (const dest of destinations as Destination[]) {
		if (!dest.id || !dest.name) {
			console.warn(`Skipping destination with missing ID or name: ${JSON.stringify(dest)}`);
			continue;
		}

		// 2. For each destination, fetch its associated parks
		const { data: parks, error: parksError } = await supabase.from("parks").select("id, name, is_destination").eq("destination_id", dest.id);

		if (parksError) {
			console.error(`Error fetching parks for destination ${dest.name} (ID: ${dest.id}): ${parksError.message}`);
			continue;
		}

		if (!parks) {
			console.log(`No parks found for destination ${dest.name} (ID: ${dest.id}).`);
			continue;
		}

		// 3. If a destination has only one park, update that park's `is_destination`
		if (parks.length === 1) {
			const singlePark = parks[0] as Park;
			if (singlePark.is_destination !== true) {
				console.log(`Destination ${dest.name} (ID: ${dest.id}) has only one park: ${singlePark.name} (ID: ${singlePark.id}). Setting 'is_destination' to TRUE.`);
				const { error: updateError } = await supabase.from("parks").update({ is_destination: true }).eq("id", singlePark.id);

				if (updateError) {
					console.error(`Error updating park ${singlePark.name} (ID: ${singlePark.id}): ${updateError.message}`);
				} else {
					console.log(`Successfully updated 'is_destination' for park ${singlePark.name} (ID: ${singlePark.id}).`);
					parksUpdatedCount++;
				}
			} else {
				console.log(`Park ${singlePark.name} (ID: ${singlePark.id}) for destination ${dest.name} (ID: ${dest.id}) already has 'is_destination' set to TRUE.`);
			}
		} else if (parks.length > 1) {
			// Optional: If there are multiple parks, ensure 'is_destination' is false or null for all of them
			// This might be useful for data consistency if a destination previously had one park and now has more.
			for (const park of parks as Park[]) {
				if (park.is_destination === true) {
					console.log(`Destination ${dest.name} (ID: ${dest.id}) has multiple parks. Park ${park.name} (ID: ${park.id}) incorrectly has 'is_destination' as TRUE. Setting to FALSE.`);
					const { error: updateError } = await supabase
						.from("parks")
						.update({ is_destination: false }) // or null, depending on your schema preference
						.eq("id", park.id);
					if (updateError) {
						console.error(`Error setting 'is_destination' to FALSE for park ${park.name} (ID: ${park.id}): ${updateError.message}`);
					} else {
						parksUpdatedCount++; // Count this as an update too
					}
				}
			}
		}
	}

	console.log(`Finished updating 'is_destination' flag. Total parks updated: ${parksUpdatedCount}.`);
}
