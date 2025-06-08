// Defines the structure for a park entry within a destination
export interface DestinationParkEntry {
	id?: string;
	name?: string;
}

// Defines the base structure for a destination single entry
export interface DestinationEntry {
	id?: string;
	name?: string;
	slug?: string;
	parks?: DestinationParkEntry[];
}

// Defines the base response structure for destinations
export interface DestinationsResponse {
	destinations?: DestinationEntry[];
}
