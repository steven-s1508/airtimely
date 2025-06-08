import { DestinationEntry, DestinationsResponse, DestinationParkEntry, EntityChildrenResponse, EntityChild, EntityData, EntityLocation, EntityLiveDataResponse, EntityLiveData, EntityScheduleResponse, ScheduleEntry } from "../types/schemas";

const API_BASE_URL = "https://api.themeparks.wiki/v1";
const API_DESTINATIONS_URL = "/destinations";
const API_ENTITY_URL = "/entity/{entityID}";
const API_ENTITY_CHILDREN_URL = "/entity/{entityID}/children";
const API_ENTITY_LIVE_DATA_URL = "/entity/{entityID}/live"; // We'll skip populating live data in initial static load for now
const API_ENTITY_SCHEDULE_URL = "/entity/{entityID}/schedule";
// const API_ENTITY_SCHEDULE_HISTORY_URL = "//entity/{entityID}/schedule/{year}/{month}"; // Not used in this script

// Function to fetch destinations, parks, and rides from the API
export async function fetchDestinations(): Promise<DestinationsResponse | null> {
	const response = await fetch(`${API_BASE_URL}${API_DESTINATIONS_URL}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch destinations: ${response.statusText}`);
	}
	return response.json();
}

// Function to fetch data for a specific entity (destination or park)
export async function fetchEntity(entityID: string): Promise<EntityData | null> {
	const url = API_ENTITY_URL.replace("{entityID}", entityID);
	try {
		const response = await fetch(`${API_BASE_URL}${url}`);
		if (!response.ok) {
			console.error(`Failed to fetch entity ${entityID}: ${response.statusText} (${response.status})`);
			return null; // Return null instead of throwing to allow partial success
		}
		return response.json();
	} catch (error) {
		console.error(`Network error fetching entity ${entityID}:`, error);
		return null;
	}
}

// Function to fetch children of a specific park
export async function fetchEntityChildren(entityID: string): Promise<EntityChildrenResponse | null> {
	const url = API_ENTITY_CHILDREN_URL.replace("{entityID}", entityID);
	try {
		const response = await fetch(`${API_BASE_URL}${url}`);
		if (!response.ok) {
			console.error(`Failed to fetch entity children for ${entityID}: ${response.statusText} (${response.status})`);
			return null;
		}
		return response.json();
	} catch (error) {
		console.error(`Network error fetching entity children for ${entityID}:`, error);
		return null;
	}
}

// Function to fetch schedule for a specific entity
export async function fetchEntitySchedule(entityID: string): Promise<EntityScheduleResponse | null> {
	const url = API_ENTITY_SCHEDULE_URL.replace("{entityID}", entityID);
	try {
		const response = await fetch(`${API_BASE_URL}${url}`);
		if (!response.ok) {
			console.error(`Failed to fetch schedule for ${entityID}: ${response.statusText} (${response.status})`);
			return null;
		}
		return response.json();
	} catch (error) {
		console.error(`Network error fetching schedule for ${entityID}:`, error);
		return null;
	}
}
