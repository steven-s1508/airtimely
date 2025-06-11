import { supabase } from "@src/utils/supabase";
import { EntityChildrenResponse } from "@src/types/themeparksWikiApi/entityChildren.d";
import { EntityType as ApiEntityType } from "@src/types/themeparksWikiApi/entityChildren.d";
import type { Tables, TablesInsert } from "@src/types/database.types";
import { randomUUID } from "expo-crypto";

const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";

// Helper function to generate a simple slug
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, "-") // Replace spaces with -
		.replace(/[^\w-]+/g, "") // Remove all non-word chars
		.replace(/--+/g, "-") // Replace multiple - with single -
		.replace(/^-+/, "") // Trim - from start of text
		.replace(/-+$/, ""); // Trim - from end of text
}

/**
 * Fetches child entities for a given entity ID directly from ThemeParks.wiki API.
 * @param parkExternalId The external_id of the parent park entity.
 * @returns A promise that resolves to the API response or null if an error occurs.
 */
async function fetchChildrenDirectly(parkExternalId: string): Promise<EntityChildrenResponse | null> {
	const url = `${THEMEPARKS_API_BASE_URL}/entity/${parkExternalId}/children`;
	console.log(`Fetching children for park external_id: ${parkExternalId} from URL: ${url}`);
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`API error fetching children for park external_id ${parkExternalId}: ${response.status} ${response.statusText}. URL: ${url}`);
			const errorBody = await response.text();
			console.error("Error body:", errorBody);
			return null;
		}
		console.log(`Successfully fetched children for park external_id: ${parkExternalId}`);
		return (await response.json()) as EntityChildrenResponse;
	} catch (error) {
		console.error(`Network error fetching children for park external_id ${parkExternalId} from ${url}:`, error);
		return null;
	}
}

/**
 * Populates rides, shows, and restaurants for a given park.
 * @param park The park object from the database, must contain id (DB UUID) and external_id (API ID), and name.
 * @returns True if the operation was successful or no children to process, false otherwise.
 */
async function populateEntitiesForPark(park: Tables<"parks">): Promise<boolean> {
	if (!park.external_id) {
		console.warn(`Skipping park ${park.name} (ID: ${park.id}) due to missing external_id.`);
		return true; // Not an error for this function, but a data issue
	}
	console.log(`Fetching child entities for park: ${park.name} (DB ID: ${park.id}, External ID: ${park.external_id})...`);
	let overallSuccess = true;

	const entityChildrenResponse = await fetchChildrenDirectly(park.external_id);
	await new Promise((resolve) => setTimeout(resolve, 300)); // API delay

	if (!entityChildrenResponse || !entityChildrenResponse.children || entityChildrenResponse.children.length === 0) {
		console.log(`No child entities found for park: ${park.name} (External ID: ${park.external_id}).`);
		return true;
	}

	const ridesToUpsert: TablesInsert<"rides">[] = [];
	const showsToUpsert: TablesInsert<"shows">[] = [];
	const restaurantsToUpsert: TablesInsert<"restaurants">[] = [];

	for (const child of entityChildrenResponse.children) {
		if (!child.id || !child.name || !child.entityType) {
			console.warn(`Skipping child entity with missing API id, name, or entityType for park ${park.name} (External ID: ${park.external_id}):`, child);
			continue;
		}

		const commonData = {
			id: randomUUID(), // Database unique ID
			external_id: child.id, // ID from the API for this child entity
			name: child.name,
			slug: generateSlug(child.name),
			latitude: child.location?.latitude || null,
			longitude: child.location?.longitude || null,
			is_active: true,
			park_id: park.id, // Foreign key to the park's database UUID
			entity_type: child.entityType,
			// child_api_external_id: child.externalId || null, // If the API child has its own 'externalId' field distinct from 'child.id'
		};

		switch (child.entityType) {
			case ApiEntityType.ATTRACTION:
				ridesToUpsert.push(commonData as TablesInsert<"rides">); // Ensure type compatibility
				break;
			case ApiEntityType.SHOW:
				showsToUpsert.push(commonData as TablesInsert<"shows">);
				break;
			case ApiEntityType.RESTAURANT:
				restaurantsToUpsert.push(commonData as TablesInsert<"restaurants">);
				break;
			default:
				break;
		}
	}

	// logs for debugging
	console.log(`Found ${ridesToUpsert.length} rides, ${showsToUpsert.length} shows, and ${restaurantsToUpsert.length} restaurants for park ${park.name} (External ID: ${park.external_id}).`);

	// Upsert Rides
	if (ridesToUpsert.length > 0) {
		console.log(`Upserting ${ridesToUpsert.length} rides for park ${park.name} (External ID: ${park.external_id})...`);
		// onConflict targets the 'external_id' column, which must have a UNIQUE constraint.
		const { error } = await supabase.from("rides").insert(ridesToUpsert, { onConflict: "external_id" });
		if (error) {
			console.error(`Error upserting rides for park ${park.name} (External ID: ${park.external_id}):`, error);
			overallSuccess = false;
		} else {
			console.log(`Successfully upserted rides for park ${park.name} (External ID: ${park.external_id}).`);
		}
	}

	// Upsert Shows
	if (showsToUpsert.length > 0) {
		console.log(`Upserting ${showsToUpsert.length} shows for park ${park.name} (External ID: ${park.external_id})...`);
		const { error } = await supabase.from("shows").insert(showsToUpsert, { onConflict: "external_id" });
		if (error) {
			console.error(`Error upserting shows for park ${park.name} (External ID: ${park.external_id}):`, error);
			overallSuccess = false;
		} else {
			console.log(`Successfully upserted shows for park ${park.name} (External ID: ${park.external_id}).`);
		}
	}

	// Upsert Restaurants
	if (restaurantsToUpsert.length > 0) {
		console.log(`Upserting ${restaurantsToUpsert.length} restaurants for park ${park.name} (External ID: ${park.external_id})...`);
		const { error } = await supabase.from("restaurants").insert(restaurantsToUpsert, { onConflict: "external_id" });
		if (error) {
			console.error(`Error upserting restaurants for park ${park.name} (External ID: ${park.external_id}):`, error);
			overallSuccess = false;
		} else {
			console.log(`Successfully upserted restaurants for park ${park.name} (External ID: ${park.external_id}).`);
		}
	}

	return overallSuccess;
}

/**
 * Main function to fetch all parks and populate their child entities.
 */
export default async function runFullPopulationProcess() {
	console.log("Starting full population process for park child entities...");

	const { data: parks, error: parksError } = await supabase.from("parks").select("*");

	if (parksError) {
		console.error("Error fetching parks:", parksError);
		return;
	}

	if (!parks || parks.length === 0) {
		console.log("No active parks found to process.");
		return;
	}

	console.log(`Found ${parks.length} active park(s) to process.`);
	let parksProcessedSuccessfully = 0;
	let parksFailed = 0;

	for (const park of parks) {
		if (!park.external_id) {
			// Check for external_id
			console.warn("Skipping park with missingw external_id:", park);
			parksFailed++;
			continue;
		}
		console.log(`\nProcessing park: ${park.name} (External ID: ${park.external_id})`);
		const success = await populateEntitiesForPark(park);
		if (success) {
			parksProcessedSuccessfully++;
		} else {
			parksFailed++;
			console.warn(`Failed to fully process entities for park: ${park.name} (External ID: ${park.external_id})`);
		}
		await new Promise((resolve) => setTimeout(resolve, 500)); // Delay between parks
	}

	console.log("\n--- Full Population Process Summary ---");
	console.log(`Total parks processed: ${parks.length}`);
	console.log(`Parks successfully processed: ${parksProcessedSuccessfully}`);
	console.log(`Parks with failures: ${parksFailed}`);
	console.log("------------------------------------");
}

// If this script is run directly, execute the main population function.
if (require.main === module) {
	runFullPopulationProcess()
		.then(() => console.log("Population script finished."))
		.catch((error) => console.error("Population script failed:", error));
}
