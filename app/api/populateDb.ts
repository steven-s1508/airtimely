/**
 *
 * Fetches destinations, parks and rides from the API.
 * Sends data to Supabase to update the static data tables.
 * This is intended to be run once to populate the database.
 */

import { supabase } from "@/src/utils/supabase";
import { DestinationsResponse } from "@/src/types/themeparksWikiApi/destinations.d";
import { EntityData, EntityType } from "@/src/types/themeparksWikiApi/entity.d";
import { fetchDestinations, fetchEntity, fetchEntityChildren } from "@/app/api/themeparksApi";
import { fetchNominatimData } from "./nominatimApi";
import { randomUUID } from "expo-crypto";

const THEMEPARKS_API_REQUEST_DELAY_MS = 210; // Approx. 5 requests/sec, (60000ms / 300req) = 200ms/req

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const Chains = [
	{ name: "Disney Parks, Experiences and Products", slug: "disney", website: "https://disneyparks.disney.go.com/" },
	{ name: "Universal Destinations & Experiences", slug: "universal", website: "https://www.universalparks.com/" },
	{ name: "Six Flags Entertainment Corporation", slug: "six-flags", website: "https://www.sixflags.com/" },
	{ name: "Cedar Fair Entertainment Company", slug: "cedar-fair", website: "https://www.cedarfair.com/" },
	{ name: "Merlin Entertainments", slug: "merlin", website: "https://www.merlinentertainments.biz/" },
	{ name: "United Parks & Resorts", slug: "united-parks", website: "https://seaworldentertainment.com/" },
	{ name: "Parques Reunidos", slug: "parques-reunidos", website: "https://www.parquesreunidos.com/en" },
	{ name: "Compagnie des Alpes", slug: "compagnie-des-alpes", website: "https://www.compagniedesalpes.com/en" },
	{ name: "Plopsa Group", slug: "plopsa", website: "https://www.plopsa.com/en" },
	{ name: "Herschend Family Entertainment", slug: "herschend", website: "https://www.herschendenterprises.com/" },
];

async function populateChains() {
	console.log("Populating chains...");
	for (const chain of Chains) {
		console.log(`Processing chain: ${chain.name}`);

		const { data, error } = await supabase
			.from("chains")
			.insert([
				{
					name: chain.name,
					slug: chain.slug,
					website: chain.website,
				},
			])
			.select();

		if (error) {
			console.error(`Error inserting chain ${chain.name}:`, error.message);
		} else if (data) {
			console.log(`Inserted chain: ${data[0].name}`);
		}
	}
	console.log("Finished populating chains.");
}

async function populateDestinations(destinationsResponse: DestinationsResponse) {
	// Signature updated
	console.log("Populating destinations...");
	// const destinationsResponse = await fetchDestinations(); // Removed - now passed as parameter

	if (!destinationsResponse || !destinationsResponse.destinations || destinationsResponse.destinations.length === 0) {
		console.log("No destinations found to populate.");
		return;
	}

	for (const apiDestination of destinationsResponse.destinations) {
		if (!apiDestination.id || !apiDestination.name) {
			console.warn(`Skipping destination with missing id or name: ${JSON.stringify(apiDestination)}`);
			continue;
		}

		console.log(`Processing destination: ${apiDestination.name}`);

		try {
			const entityData: EntityData | null = await fetchEntity(apiDestination.id);
			await delay(THEMEPARKS_API_REQUEST_DELAY_MS); // Respect rate limit

			if (!entityData || entityData.entityType !== EntityType.DESTINATION) {
				console.error(`Failed to fetch valid entity data for destination ${apiDestination.name} (ID: ${apiDestination.id}) or type is not DESTINATION.`);
				continue;
			}

			let chainId: string | null = null;
			if (entityData.parentId) {
				const { data: chainData, error: chainError } = await supabase.from("chains").select("id").eq("slug", entityData.parentId).single();
				if (chainError) {
					console.warn(`Error fetching chain with slug ${entityData.parentId} for destination ${entityData.name}: ${chainError.message}`);
				} else if (chainData) {
					chainId = chainData.id;
				} else {
					console.warn(`Chain with slug ${entityData.parentId} not found for destination ${entityData.name}.`);
				}
			}

			let countryCode: string | null = null;
			let geocodeData: NominatimResponse | null = null;

			if (entityData.location?.latitude && entityData.location?.longitude) {
				try {
					// fetchNominatimData already has its own delay for nominatim.openstreetmap.org
					const nominatimResult = await fetchNominatimData(entityData.location.latitude, entityData.location.longitude);
					if (nominatimResult) {
						geocodeData = nominatimResult; // Store the whole response
						if (nominatimResult.address && nominatimResult.address.country_code) {
							countryCode = nominatimResult.address.country_code.toUpperCase();
						}
					}
				} catch (geoError: any) {
					console.error(`Error fetching geocode for ${entityData.name}: ${geoError.message}`);
				}
			}

			const destinationRecord = {
				id: randomUUID(),
				name: entityData.name,
				slug: entityData.slug,
				external_id: entityData.id,
				timezone: entityData.timezone,
				chain_id: chainId,
				country_code: countryCode,
				geocode_data: geocodeData,
				website: null,
			};

			const { data: insertedData, error: insertError } = await supabase.from("destinations").insert([destinationRecord]).select();
			if (insertError) {
				console.error(`Error inserting destination ${entityData.name}: ${insertError.message}`);
			} else if (insertedData) {
				console.log(`Inserted destination: ${insertedData[0].name}`);
			}
		} catch (error: any) {
			console.error(`Unhandled error processing destination ${apiDestination.name}: ${error.message}`);
		}
	}
	console.log("Finished populating destinations.");
}

async function populateParks(destinationsResponse: DestinationsResponse) {
	console.log("Populating parks...");

	if (!destinationsResponse || !destinationsResponse.destinations || destinationsResponse.destinations.length === 0) {
		console.log("No API destinations provided to populate parks for.");
		return;
	}

	for (const apiDestination of destinationsResponse.destinations) {
		if (!apiDestination.id || !apiDestination.name) {
			console.warn(`Skipping destination (for parks processing) with missing id or name: ${JSON.stringify(apiDestination)}`);
			continue;
		}

		// Fetch our DB record for this destination to get its internal UUID and country_code
		const { data: dbDestinationData, error: dbDestError } = await supabase
			.from("destinations")
			.select("id, country_code, name") // name for logging
			.eq("external_id", apiDestination.id) // apiDestination.id is the external_id
			.single();

		if (dbDestError || !dbDestinationData) {
			console.error(`Could not find destination '${apiDestination.name}' (External ID: ${apiDestination.id}) in our database. Skipping its parks. Error: ${dbDestError ? dbDestError.message : "No data returned"}`);
			continue;
		}

		const internalDestinationId = dbDestinationData.id;
		const destinationCountryCode = dbDestinationData.country_code; // Fallback country code

		console.log(`Processing parks for destination: ${dbDestinationData.name || apiDestination.name} (DB ID: ${internalDestinationId})`);

		if (!apiDestination.parks || apiDestination.parks.length === 0) {
			console.log(`No parks listed in API response for destination ${apiDestination.name}.`);
			continue;
		}

		for (const parkReference of apiDestination.parks) {
			if (!parkReference.id || !parkReference.name) {
				console.warn(`Skipping park reference with missing id or name for destination ${apiDestination.name}: ${JSON.stringify(parkReference)}`);
				continue;
			}

			console.log(`Fetching entity data for park: ${parkReference.name} (External ID: ${parkReference.id})`);
			const parkEntity: EntityData | null = await fetchEntity(parkReference.id);
			await delay(THEMEPARKS_API_REQUEST_DELAY_MS); // Respect rate limit

			if (!parkEntity) {
				console.error(`Failed to fetch entity data for park ${parkReference.name} (ID: ${parkReference.id}).`);
				continue;
			}

			console.log(`Processing park entity: ${parkEntity.name} (External ID: ${parkEntity.id})`);

			let parkCountryCode: string | null = null;
			if (parkEntity.location?.latitude && parkEntity.location?.longitude) {
				try {
					// fetchNominatimData already has its own delay for nominatim.openstreetmap.org
					const nominatimResult = await fetchNominatimData(parkEntity.location.latitude, parkEntity.location.longitude);
					if (nominatimResult && nominatimResult.address && nominatimResult.address.country_code) {
						parkCountryCode = nominatimResult.address.country_code.toUpperCase();
						console.log(`Geocoded country for park ${parkEntity.name}: ${parkCountryCode}`);
					} else {
						console.warn(`Could not geocode country for park ${parkEntity.name}. Falling back to destination's country code: ${destinationCountryCode}`);
						parkCountryCode = destinationCountryCode;
					}
				} catch (geoError: any) {
					console.error(`Error fetching geocode for park ${parkEntity.name}: ${geoError.message}. Falling back to destination's country code: ${destinationCountryCode}`);
					parkCountryCode = destinationCountryCode;
				}
			} else {
				console.log(`Park ${parkEntity.name} has no location data. Using destination's country code: ${destinationCountryCode}`);
				parkCountryCode = destinationCountryCode;
			}

			const parkRecord = {
				id: randomUUID(),
				destination_id: internalDestinationId,
				name: parkEntity.name,
				slug: parkEntity.slug || null,
				entity_type: "PARK",
				timezone: parkEntity.timezone,
				country_code: parkCountryCode,
				latitude: parkEntity.location?.latitude || null,
				longitude: parkEntity.location?.longitude || null,
				external_id: parkEntity.id,
				is_active: true,
				is_destination: false,
				// rcdb_url will use DB default (null)
			};

			const { data: insertedPark, error: insertParkError } = await supabase.from("parks").insert([parkRecord]).select("name");

			if (insertParkError) {
				console.error(`Error inserting park ${parkEntity.name} (External ID: ${parkEntity.id}): ${insertParkError.message}`);
				if (insertParkError.message.includes("unique constraint") || insertParkError.message.includes("duplicate key")) {
					console.warn(`Park ${parkEntity.name} (External ID: ${parkEntity.id}) might already exist.`);
				}
			} else if (insertedPark) {
				console.log(`Inserted park: ${insertedPark[0].name}`);
			}
		}
	}
	console.log("Finished populating parks.");
}

export default async function populateAllStaticData() {
	console.log("Starting static data population process...");
	const destinationsResponse = await fetchDestinations();
	await delay(THEMEPARKS_API_REQUEST_DELAY_MS); // Respect rate limit after the initial fetch

	if (!destinationsResponse) {
		console.error("Failed to fetch initial destinations list from API. Aborting population.");
		return;
	}

	await populateChains(); // This function does not make external API calls
	await populateDestinations(destinationsResponse);
	await populateParks(destinationsResponse);
	console.log("All static data population process finished.");
}
