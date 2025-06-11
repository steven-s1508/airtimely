import { supabase } from "@/src/utils/supabase";
import { fetchNominatimData } from "./nominatimApi";
import { fetchEntity } from "./themeparksApi";
import type { NominatimResponse } from "@/src/types/nominatimApi";
import type { EntityData } from "@/src/types/themeparksWikiApi/entity";
import type { Tables } from "@/src/types/database.types";

const THEMEPARKS_API_REQUEST_DELAY_MS = 210; // To respect theme parks API rate limits

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string | null | undefined): string {
	if (!text) return "";
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-") // Replace spaces with -
		.replace(/[^\w-]+/g, "") // Remove all non-word chars but hyphens
		.replace(/--+/g, "-") // Replace multiple - with single -
		.replace(/^-+/, "") // Trim - from start of text
		.replace(/-+$/, ""); // Trim - from end of text
}

type DestinationRow = Tables<"destinations">;
type DestinationUpdate = Partial<Pick<DestinationRow, "slug" | "geocode_data" | "country_code" | "latitude" | "longitude">>;

type ParkRow = Tables<"parks">;
type ParkUpdate = Partial<Pick<ParkRow, "slug" | "geocode_data" | "country_code" | "latitude" | "longitude">>;

async function fillMissingDestinationData() {
	console.log("Starting to fill missing data for destinations...");
	const { data: destinations, error: destError } = await supabase.from("destinations").select("id, name, slug, country_code, geocode_data, external_id, latitude, longitude");

	if (destError) {
		console.error("Error fetching destinations:", destError.message);
		return;
	}
	if (!destinations || destinations.length === 0) {
		console.log("No destinations found to process.");
		return;
	}

	for (const dest of destinations as DestinationRow[]) {
		const updates: DestinationUpdate = {};
		let needsDbUpdate = false;
		let entityDataFetched: EntityData | null = null; // To store fetched entity data

		// 1. Fill slug
		if (!dest.slug && dest.name) {
			const newSlug = slugify(dest.name);
			if (newSlug) {
				updates.slug = newSlug;
				needsDbUpdate = true;
				console.log(`Destination ${dest.name} (ID: ${dest.id}): Generated slug '${newSlug}'.`);
			}
		}

		// Conditions to fetch Entity Data (for geocode, lat, or lon)
		const needsGeoOrCoords = !dest.geocode_data || dest.latitude === null || dest.longitude === null;

		if (needsGeoOrCoords && dest.external_id) {
			console.log(`Destination ${dest.name} (ID: ${dest.id}): Missing geocode_data, latitude, or longitude. Attempting to fetch entity data.`);
			entityDataFetched = await fetchEntity(dest.external_id);
			await delay(THEMEPARKS_API_REQUEST_DELAY_MS);

			if (entityDataFetched?.location) {
				// 2a. Fill latitude if missing
				if (dest.latitude === null && typeof entityDataFetched.location.latitude === "number") {
					updates.latitude = entityDataFetched.location.latitude;
					needsDbUpdate = true;
					console.log(`Destination ${dest.name} (ID: ${dest.id}): Updated latitude to ${updates.latitude}.`);
				}
				// 2b. Fill longitude if missing
				if (dest.longitude === null && typeof entityDataFetched.location.longitude === "number") {
					updates.longitude = entityDataFetched.location.longitude;
					needsDbUpdate = true;
					console.log(`Destination ${dest.name} (ID: ${dest.id}): Updated longitude to ${updates.longitude}.`);
				}
			} else {
				console.warn(`Could not retrieve location data for ${dest.name} (ID: ${dest.id}) from its entity data.`);
			}
		}

		// 2c. Fill geocode_data if missing
		let newGeocodeDataFetched: NominatimResponse | null = null;
		if (!dest.geocode_data) {
			const latForGeocode = dest.latitude ?? entityDataFetched?.location?.latitude;
			const lonForGeocode = dest.longitude ?? entityDataFetched?.location?.longitude;

			if (typeof latForGeocode === "number" && typeof lonForGeocode === "number") {
				console.log(`Fetching Nominatim data for ${dest.name} (ID: ${dest.id}) using coords: ${latForGeocode}, ${lonForGeocode}`);
				const nominatimResult = await fetchNominatimData(latForGeocode, lonForGeocode); // Has its own delay
				if (nominatimResult) {
					updates.geocode_data = nominatimResult as any; // Supabase client handles JSON
					newGeocodeDataFetched = nominatimResult;
					needsDbUpdate = true;
					console.log(`Destination ${dest.name} (ID: ${dest.id}): Fetched new geocode_data.`);
				} else {
					console.warn(`Nominatim returned no data for ${dest.name} (ID: ${dest.id}).`);
				}
			} else if (dest.external_id && !entityDataFetched) {
				// Only log if we haven't already tried and failed to get entityData
				console.warn(`Destination ${dest.name} (ID: ${dest.id}): Cannot fetch geocode_data without coordinates and entity data could not be fetched or had no location.`);
			}
		}

		// 3. Fill country_code if missing
		if (!dest.country_code) {
			const geocodeDataSource = newGeocodeDataFetched || (dest.geocode_data as NominatimResponse | null);
			if (geocodeDataSource?.address?.country_code) {
				updates.country_code = geocodeDataSource.address.country_code.toUpperCase();
				needsDbUpdate = true;
				console.log(`Destination ${dest.name} (ID: ${dest.id}): Derived country_code '${updates.country_code}' from geocode_data.`);
			} else {
				console.warn(`Destination ${dest.name} (ID: ${dest.id}): Cannot derive country_code. Geocode_data missing or lacks country_code.`);
			}
		}

		if (needsDbUpdate && Object.keys(updates).length > 0) {
			console.log(`Updating destination ${dest.name} (ID: ${dest.id}) with:`, JSON.stringify(updates));
			const { error: updateError } = await supabase.from("destinations").update(updates).eq("id", dest.id);
			if (updateError) {
				console.error(`Error updating destination ${dest.name} (ID: ${dest.id}): ${updateError.message}`);
			} else {
				console.log(`Successfully updated destination ${dest.name} (ID: ${dest.id}).`);
			}
		}
	}
	console.log("Finished processing destinations.");
}

async function fillMissingParkData() {
	console.log("Starting to fill missing data for parks...");
	const { data: parks, error: parkError } = await supabase.from("parks").select("id, name, slug, country_code, latitude, longitude, destination_id, geocode_data");

	if (parkError) {
		console.error("Error fetching parks:", parkError.message);
		return;
	}
	if (!parks || parks.length === 0) {
		console.log("No parks found to process.");
		return;
	}

	for (const park of parks as ParkRow[]) {
		const updates: ParkUpdate = {};
		let needsDbUpdate = false;

		// 1. Fill slug
		if (!park.slug && park.name) {
			const newSlug = slugify(park.name);
			if (newSlug) {
				updates.slug = newSlug;
				needsDbUpdate = true;
				console.log(`Park ${park.name} (ID: ${park.id}): Generated slug '${newSlug}'.`);
			}
		}

		// 2. Fill geocode_data if missing and coordinates are available
		if (!park.geocode_data && park.latitude !== null && park.longitude !== null) {
			console.log(`Park ${park.name} (ID: ${park.id}): geocode_data missing. Attempting to fetch with coords: ${park.latitude}, ${park.longitude}`);
			const nominatimResult = await fetchNominatimData(park.latitude, park.longitude); // Has its own delay
			if (nominatimResult) {
				updates.geocode_data = nominatimResult as any; // Supabase client handles JSON
				needsDbUpdate = true;
				console.log(`Park ${park.name} (ID: ${park.id}): Fetched new geocode_data.`);
			} else {
				console.warn(`Nominatim returned no geocode_data for park ${park.name} (ID: ${park.id}) using its coordinates.`);
			}
		}

		// 3. Fill country_code
		if (!park.country_code) {
			let derivedCountryCode = false;
			// Try deriving from park's own geocode_data (either existing or newly fetched)
			const parkGeocodeDataSource = updates.geocode_data || (park.geocode_data as NominatimResponse | null);
			if (parkGeocodeDataSource?.address?.country_code) {
				updates.country_code = parkGeocodeDataSource.address.country_code.toUpperCase();
				needsDbUpdate = true;
				derivedCountryCode = true;
				console.log(`Park ${park.name} (ID: ${park.id}): Derived country_code '${updates.country_code}' from its geocode_data.`);
			} else if (park.latitude !== null && park.longitude !== null && !parkGeocodeDataSource) {
				// If geocode_data wasn't there and couldn't be fetched, but we have coords, try Nominatim directly for country code
				console.log(`Park ${park.name} (ID: ${park.id}): country_code missing & no geocode_data. Attempting geocode for country_code with coords: ${park.latitude}, ${park.longitude}`);
				const nominatimResult = await fetchNominatimData(park.latitude, park.longitude);
				if (nominatimResult?.address?.country_code) {
					updates.country_code = nominatimResult.address.country_code.toUpperCase();
					needsDbUpdate = true;
					derivedCountryCode = true;
					console.log(`Park ${park.name} (ID: ${park.id}): Derived country_code '${updates.country_code}' from Nominatim via direct coord lookup.`);
				} else {
					console.warn(`Nominatim returned no country_code for park ${park.name} (ID: ${park.id}) from direct coord lookup.`);
				}
			}

			// Fallback to destination's country code if still no country_code and destination_id exists
			if (!updates.country_code && !derivedCountryCode && park.destination_id) {
				console.log(`Park ${park.name} (ID: ${park.id}): Still no country_code. Attempting fallback to destination ID ${park.destination_id}.`);
				const { data: destData, error: destFetchError } = await supabase.from("destinations").select("country_code").eq("id", park.destination_id).single();

				if (destFetchError) {
					console.error(`Error fetching parent destination for park ${park.name} (ID: ${park.id}): ${destFetchError.message}`);
				} else if (destData?.country_code) {
					updates.country_code = destData.country_code;
					needsDbUpdate = true;
					console.log(`Park ${park.name} (ID: ${park.id}): Used country_code '${updates.country_code}' from parent destination.`);
				} else {
					console.warn(`Parent destination for park ${park.name} (ID: ${park.id}) has no country_code or not found.`);
				}
			}

			if (!updates.country_code && !derivedCountryCode) {
				console.warn(`Park ${park.name} (ID: ${park.id}): Could not determine country_code.`);
			}
		}

		if (needsDbUpdate && Object.keys(updates).length > 0) {
			console.log(`Updating park ${park.name} (ID: ${park.id}) with:`, JSON.stringify(updates));
			const { error: updateError } = await supabase.from("parks").update(updates).eq("id", park.id);
			if (updateError) {
				console.error(`Error updating park ${park.name} (ID: ${park.id}): ${updateError.message}`);
			} else {
				console.log(`Successfully updated park ${park.name} (ID: ${park.id}).`);
			}
		}
	}
	console.log("Finished processing parks.");
}

export default async function fillMissingDbDataGaps() {
	console.log("Starting to fill database gaps for slugs, geocode_data, and country_codes...");
	await fillMissingDestinationData();
	await fillMissingParkData();
	console.log("Finished filling database gaps.");
}
