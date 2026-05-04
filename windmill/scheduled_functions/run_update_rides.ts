import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types copied from entityChildren.d.ts
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

export interface EntityChild {
    id: string;
    name: string;
    slug?: string;
    entityType: EntityType;
    parentId?: string;
    externalId?: string;
    location?: EntityLocation | null;
}

export interface EntityChildrenResponse {
    id?: string;
    name?: string;
    slug?: string;
    entityType?: EntityType;
    timezone?: string;
    children?: EntityChild[];
}

const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";
const THEMEPARKS_API_REQUEST_DELAY_MS = 210;

async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w\-]+/g, "") // Remove all non-word chars
        .replace(/\-\-+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start of text
        .replace(/-+$/, ""); // Trim - from end of text
}

async function fetchParkRides(externalId: string): Promise<EntityChild[]> {
    const url = `${THEMEPARKS_API_BASE_URL}/entity/${externalId}/children`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Failed to fetch rides for park ${externalId}: ${response.statusText}`);
        return [];
    }
    const data: EntityChildrenResponse = await response.json();
    return data.children?.filter((c) => c.entityType === "ATTRACTION") ?? [];
}

async function updateRidesTable(supabase: any) {
    const { data: parks, error: parksError } = await supabase
        .from("parks")
        .select("id, external_id, name")
        .eq("is_active", true)
        .not("external_id", "is", null);

    if (parksError) throw new Error("Error fetching parks");

    let newRides = 0, updatedRides = 0, deactivatedRides = 0;

    for (const park of parks) {
        const apiRides = await fetchParkRides(park.external_id);

        // Get existing rides for this park
        const { data: dbRides, error: dbRidesError } = await supabase
            .from("rides")
            .select("id, external_id, name, slug, is_active")
            .eq("park_id", park.id);

        if (dbRidesError) {
            console.error(`Error fetching rides for park ${park.name}:`, dbRidesError);
            continue;
        }

        const dbRidesMap = new Map(dbRides.map((r: any) => [r.external_id, r]));

        // Insert or update rides
        for (const apiRide of apiRides) {
          const dbRide = dbRidesMap.get(apiRide.id) as any; // Use API 'id' for matching
          if (!dbRide) {
            console.log(`Inserting new ride with data: ${apiRide.name} (${JSON.stringify(apiRide)})`);
              // New ride: insert
              const { error: insertError } = await supabase.from("rides").insert({
                  name: apiRide.name,
                  slug: apiRide.slug || slugify(apiRide.name),
                  external_id: apiRide.id,
                  park_id: park.id,
                  entity_type: "ATTRACTION",
                  is_active: true,
                  latitude: apiRide.location?.latitude ?? null,
                  longitude: apiRide.location?.longitude ?? null,
              });
              if (!insertError) {
                newRides++;
                console.log(`Inserted new ride: ${apiRide.name} (${apiRide.id})`);
              };
              if (insertError) {
                console.log("Error: ", insertError);
              }
          } else {
              // Existing ride: update name if changed, and set is_active to true if currently false
              const updates: any = {};
              if (dbRide.name !== apiRide.name) updates.name = apiRide.name;
              
              const expectedSlug = apiRide.slug || slugify(apiRide.name);
              if (!dbRide.slug || dbRide.slug !== expectedSlug) updates.slug = expectedSlug;

              if (!dbRide.is_active) {
                  updates.is_active = true;
                  console.log(`Reactivating ride: ${dbRide.name} (${dbRide.external_id})`);
              }
              if (Object.keys(updates).length > 0) {
                  const { error: updateError } = await supabase
                      .from("rides")
                      .update(updates)
                      .eq("id", dbRide.id);
                  if (!updateError) updatedRides++;
              }
          }
      }

        // Deactivate rides no longer present in API
        const apiRideIds = new Set(apiRides.map((r) => r.id));
        console.log("API ride ids:", Array.from(apiRideIds));
        console.log("DB external_ids:", dbRides.map((r: any) => r.external_id));

        for (const dbRide of dbRides) {
            if (dbRide.external_id && !apiRideIds.has(dbRide.external_id) && dbRide.is_active) {
                console.log(`Deactivating ride: DB external_id=${dbRide.external_id}, name=${dbRide.name}`);
                const { error: deactivateError } = await supabase
                    .from("rides")
                    .update({ is_active: false })
                    .eq("id", dbRide.id);
                if (!deactivateError) deactivatedRides++;
            }
        }

        await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
    }

    return {
        success: true,
        newRides,
        updatedRides,
        deactivatedRides,
        message: `Rides update completed: ${newRides} new, ${updatedRides} updated, ${deactivatedRides} deactivated.`,
    };
}

export async function main() {
    const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
    const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    return await updateRidesTable(supabase);
}