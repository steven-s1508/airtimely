import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Types ---

export enum EntityType {
    DESTINATION = "DESTINATION",
    PARK = "PARK",
    ATTRACTION = "ATTRACTION",
    RESTAURANT = "RESTAURANT",
    HOTEL = "HOTEL",
    SHOW = "SHOW",
}

export interface EntityLocation {
    latitude?: number;
    longitude?: number;
}

export interface EntityData {
    id: string;
    name: string;
    slug?: string;
    location?: EntityLocation | null;
    parentId?: string | null;
    timezone: string;
    entityType: EntityType;
    destinationId?: string | null;
    externalId?: string | null;
}

export interface DestinationParkEntry {
    id: string;
    name: string;
}

export interface DestinationEntry {
    id: string;
    name: string;
    slug: string;
    parks: DestinationParkEntry[];
}

export interface DestinationsResponse {
    destinations: DestinationEntry[];
}

// --- Configuration ---

const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";
const THEMEPARKS_API_REQUEST_DELAY_MS = 210;
const NOMINATIM_API_BASE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_REQUEST_DELAY_MS = 1000;

// --- Helpers ---

async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-");
}

async function fetchFromAPI(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "User-Agent": "Airtimely-Windmill-Updater (hi@airtimely.app)",
            ...options.headers,
        },
    });
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText} for ${url}`);
    }
    return await response.json();
}

async function fetchEntityData(entityId: string): Promise<EntityData> {
    return await fetchFromAPI(`${THEMEPARKS_API_BASE_URL}/entity/${entityId}`);
}

async function fetchGeocodeData(lat: number, lon: number) {
    const url = `${NOMINATIM_API_BASE_URL}?format=jsonv2&lat=${lat}&lon=${lon}`;
    return await fetchFromAPI(url);
}

// --- Database Operations ---

async function upsertDestination(supabase: any, entity: EntityData, dryRun: boolean) {
    console.log(`Processing destination: ${entity.name} (${entity.id})`);

    // Check if exists
    const { data: existing } = await supabase
        .from("destinations")
        .select("id, name, slug, timezone, latitude, longitude, geocode_data, country_code, external_id")
        .eq("external_id", entity.id)
        .maybeSingle();

    let geocodeData = existing?.geocode_data;
    let countryCode = existing?.country_code;

    if (!geocodeData && entity.location?.latitude && entity.location?.longitude) {
        console.log(`Fetching geocode data for destination: ${entity.name}`);
        await delay(NOMINATIM_REQUEST_DELAY_MS);
        try {
            geocodeData = await fetchGeocodeData(entity.location.latitude, entity.location.longitude);
            countryCode = geocodeData?.address?.country_code?.toUpperCase() || null;
        } catch (e: any) {
            console.error(`Failed to fetch geocode data for ${entity.name}:`, e.message);
        }
    }

    const destinationData: any = {
        name: entity.name,
        slug: entity.slug || slugify(entity.name),
        timezone: entity.timezone,
        external_id: entity.id,
        latitude: entity.location?.latitude || null,
        longitude: entity.location?.longitude || null,
        geocode_data: geocodeData,
        country_code: countryCode,
        updated_at: new Date().toISOString(),
    };

    if (dryRun) {
        if (existing) {
            const changes = [];
            if (existing.name !== destinationData.name) changes.push(`name: "${existing.name}" -> "${destinationData.name}"`);
            if (existing.external_id !== destinationData.external_id) changes.push(`external_id: "${existing.external_id}" -> "${destinationData.external_id}"`);
            
            if (changes.length > 0) {
                console.log(`[Dry Run] Reason for update: Destination "${entity.name}" has changed fields: ${changes.join(", ")}`);
            } else {
                console.log(`[Dry Run] No update needed for destination: ${entity.name} (no changes in name or external_id)`);
            }
        } else {
            console.log(`[Dry Run] Reason for creation: Destination "${entity.name}" (external_id: ${entity.id}) does not exist in the database.`);
        }
        return existing?.id || "dry-run-uuid";
    }

    if (existing) {
        // Check if anything changed (only name or external_id trigger update as per user request)
        const changed = 
            existing.name !== destinationData.name ||
            existing.external_id !== destinationData.external_id;

        if (changed) {
            console.log(`Updating destination: ${entity.name}`);
            const { error } = await supabase
                .from("destinations")
                .update(destinationData)
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            console.log(`No changes for destination: ${entity.name}`);
        }
        return existing.id;
    } else {
        console.log(`Inserting new destination: ${entity.name}`);
        const newId = crypto.randomUUID();
        const { error } = await supabase
            .from("destinations")
            .insert({ ...destinationData, id: newId });
        if (error) throw error;
        return newId;
    }
}

async function upsertPark(supabase: any, entity: EntityData, destinationId: string, dryRun: boolean, isDestination: boolean = false) {
    console.log(`Processing park: ${entity.name} (${entity.id})`);

    // Check if exists
    const { data: existing } = await supabase
        .from("parks")
        .select("id, name, slug, timezone, latitude, longitude, geocode_data, country_code, is_active, destination_id, external_id, is_destination")
        .eq("external_id", entity.id)
        .maybeSingle();

    let geocodeData = existing?.geocode_data;
    let countryCode = existing?.country_code;

    if (!geocodeData && entity.location?.latitude && entity.location?.longitude) {
        console.log(`Fetching geocode data for park: ${entity.name}`);
        await delay(NOMINATIM_REQUEST_DELAY_MS);
        try {
            geocodeData = await fetchGeocodeData(entity.location.latitude, entity.location.longitude);
            countryCode = geocodeData?.address?.country_code?.toUpperCase() || null;
        } catch (e: any) {
            console.error(`Failed to fetch geocode data for ${entity.name}:`, e.message);
        }
    }

    const parkData: any = {
        destination_id: destinationId,
        name: entity.name,
        slug: entity.slug || slugify(entity.name),
        entity_type: entity.entityType,
        timezone: entity.timezone,
        external_id: entity.id,
        latitude: entity.location?.latitude || null,
        longitude: entity.location?.longitude || null,
        geocode_data: geocodeData,
        country_code: countryCode,
        is_active: true,
        is_destination: isDestination,
        updated_at: new Date().toISOString(),
    };

    if (dryRun) {
        if (existing) {
            const changes = [];
            if (existing.name !== parkData.name) changes.push(`name: "${existing.name}" -> "${parkData.name}"`);
            if (existing.external_id !== parkData.external_id) changes.push(`external_id: "${existing.external_id}" -> "${parkData.external_id}"`);
            if (existing.is_destination !== parkData.is_destination) changes.push(`is_destination: ${existing.is_destination} -> ${parkData.is_destination}`);

            if (changes.length > 0) {
                console.log(`[Dry Run] Reason for update: Park "${entity.name}" has changed fields: ${changes.join(", ")}`);
            } else {
                console.log(`[Dry Run] No update needed for park: ${entity.name} (no changes in name, external_id or is_destination)`);
            }
        } else {
            console.log(`[Dry Run] Reason for creation: Park "${entity.name}" (external_id: ${entity.id}) does not exist in the database.`);
            console.log(`Would insert new park: ${JSON.stringify(parkData)}`)
        }
        return entity.id;
    }

    if (existing) {
        // Check if anything changed (only name, external_id or is_destination trigger update as per user request)
        const changed = 
            existing.name !== parkData.name ||
            existing.external_id !== parkData.external_id ||
            existing.is_destination !== parkData.is_destination;

        if (changed) {
            console.log(`Updating park: ${entity.name}`);
            const { error } = await supabase
                .from("parks")
                .update(parkData)
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            console.log(`No changes for park: ${entity.name}`);
        }
    } else {
        console.log(`Inserting new park: ${entity.name}`);
        const newId = crypto.randomUUID();
        const { error } = await supabase
            .from("parks")
            .insert({ ...parkData, id: newId });
        if (error) throw error;
        console.log(`Inserted new park: ${JSON.stringify(parkData)}`)
    }

    return entity.id;
}

async function deactivateRemovedParks(supabase: any, activeExternalIds: string[], dryRun: boolean) {
    if (activeExternalIds.length === 0) {
        console.log("No active parks found in API response. Skipping deactivation to prevent accidental data loss.");
        return;
    }

    if (dryRun) {
        const { data: toDeactivate } = await supabase
            .from("parks")
            .select("name, external_id")
            .not("external_id", "in", `(${activeExternalIds.join(",")})`)
            .eq("is_active", true);
        
        if (toDeactivate && toDeactivate.length > 0) {
            console.log(`[Dry Run] Would deactivate ${toDeactivate.length} parks: ${toDeactivate.map((p: any) => p.name).join(", ")}`);
        } else {
            console.log("[Dry Run] No parks to deactivate.");
        }
        return;
    }

    const { error } = await supabase
        .from("parks")
        .update({ is_active: false })
        .not("external_id", "in", `(${activeExternalIds.join(",")})`)
        .eq("is_active", true);

    if (error) {
        console.error("Error deactivating parks:", error);
    } else {
        console.log("Successfully deactivated removed parks.");
    }
}

// --- Main ---

export async function main(
    park_id?: string,
    dry_run: boolean = false
) {
    const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
    const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const processedParkExternalIds: string[] = [];

    if (park_id) {
        console.log(`Running update for specific park: ${park_id}`);
        const parkEntity = await fetchEntityData(park_id);
        
        if (parkEntity.entityType !== EntityType.PARK) {
            throw new Error(`Entity ${park_id} is not a PARK (it is ${parkEntity.entityType})`);
        }

        const destId = parkEntity.destinationId || parkEntity.parentId;
        if (!destId) {
            throw new Error(`Park ${park_id} has no parent destination.`);
        }

        const destEntity = await fetchEntityData(destId);
        const dbDestId = await upsertDestination(supabase, destEntity, dry_run);
        
        await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
        // For specific park update, we don't know if it's the only park in the destination without fetching all.
        // But we can assume the user wants to preserve the current state or we can fetch the destination children.
        const destChildren = await fetchFromAPI(`${THEMEPARKS_API_BASE_URL}/entity/${destId}/children`);
        const isDestination = destChildren.children?.filter((c: any) => c.entityType === EntityType.PARK).length === 1;

        await upsertPark(supabase, parkEntity, dbDestId, dry_run, isDestination);
        
    } else {
        console.log("Running full update for all destinations and parks.");
        const destinationsResponse: DestinationsResponse = await fetchFromAPI(`${THEMEPARKS_API_BASE_URL}/destinations`);
        
        for (const destEntry of destinationsResponse.destinations) {
            await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
            const destEntity = await fetchEntityData(destEntry.id);
            const dbDestId = await upsertDestination(supabase, destEntity, dry_run);

            const isDestination = destEntry.parks.length === 1;

            for (const parkEntry of destEntry.parks) {
                await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
                try {
                    const parkEntity = await fetchEntityData(parkEntry.id);
                    const externalId = await upsertPark(supabase, parkEntity, dbDestId, dry_run, isDestination);
                    processedParkExternalIds.push(externalId);
                } catch (e: any) {
                    console.error(`Failed to process park ${parkEntry.name}:`, e.message);
                }
            }
        }

        await deactivateRemovedParks(supabase, processedParkExternalIds, dry_run);
    }

    return {
        success: true,
        dry_run,
        park_id: park_id || "all",
        processed_parks: processedParkExternalIds.length,
    };
}
