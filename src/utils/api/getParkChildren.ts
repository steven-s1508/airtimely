import { supabase } from "@/src/utils/supabase";

export interface ParkChild {
	id: string;
	external_id: string;
	name: string;
	entity_type: "ATTRACTION" | "SHOW" | "RESTAURANT";
	latitude?: number | null;
	longitude?: number | null;
	// Add wait time fields
	wait_time_minutes?: number | null;
	single_rider_wait_time_minutes?: number | null;
	status?: string | null;
	last_updated?: string | null;
}

export interface ParkChildrenResponse {
	attractions: ParkChild[];
	shows: ParkChild[];
	restaurants: ParkChild[];
}

/**
 * Fetches all child entities with their latest wait times
 */
export async function getParkChildren(parkId: string): Promise<ParkChildrenResponse | null> {
	try {
		// Fetch attractions with latest wait times
		const { data: attractions, error: attractionsError } = await supabase
			.from("rides")
			.select(
				`
                id, external_id, name, entity_type, latitude, longitude,
                ride_wait_times!inner(
                    wait_time_minutes,
                    single_rider_wait_time_minutes,
                    status,
                    recorded_at_timestamp
                )
            `
			)
			.eq("park_id", parkId)
			.eq("is_active", true)
			.order("recorded_at_timestamp", { foreignTable: "ride_wait_times", ascending: false })
			.limit(1, { foreignTable: "ride_wait_times" });

		if (attractionsError) {
			console.error("Error fetching attractions:", attractionsError);
			return null;
		}

		// Fetch shows (no wait times)
		const { data: shows, error: showsError } = await supabase.from("shows").select("id, external_id, name, entity_type, latitude, longitude").eq("park_id", parkId).eq("is_active", true);

		if (showsError) {
			console.error("Error fetching shows:", showsError);
			return null;
		}

		// Fetch restaurants (no wait times)
		const { data: restaurants, error: restaurantsError } = await supabase.from("restaurants").select("id, external_id, name, entity_type, latitude, longitude").eq("park_id", parkId).eq("is_active", true);

		if (restaurantsError) {
			console.error("Error fetching restaurants:", restaurantsError);
			return null;
		}

		// Transform attractions data to include wait times
		const attractionsWithWaitTimes = (attractions || []).map((attraction) => ({
			id: attraction.id,
			external_id: attraction.external_id,
			name: attraction.name,
			entity_type: attraction.entity_type as "ATTRACTION",
			latitude: attraction.latitude,
			longitude: attraction.longitude,
			wait_time_minutes: attraction.ride_wait_times?.[0]?.wait_time_minutes || null,
			single_rider_wait_time_minutes: attraction.ride_wait_times?.[0]?.single_rider_wait_time_minutes || null,
			status: attraction.ride_wait_times?.[0]?.status || null,
			last_updated: attraction.ride_wait_times?.[0]?.recorded_at_timestamp || null,
		}));

		return {
			attractions: attractionsWithWaitTimes,
			shows: shows || [],
			restaurants: restaurants || [],
		};
	} catch (error) {
		console.error("Error in getParkChildren:", error);
		return null;
	}
}

export default getParkChildren;
