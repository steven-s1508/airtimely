// Defines which type of entity this data represents
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

// Defines the response structure for entity children (e.g. rides, restaurants)
export interface EntityChild {
	id: string;
	name: string;
	entityType: EntityType;
	parentId?: string;
	externalId?: string;
	location?: EntityLocation | null;
}

// Defines the base response structure for entity children
export interface EntityChildrenResponse {
	id?: string;
	name?: string;
	entityType?: EntityType;
	timezone?: string;
	children?: EntityChild[];
}
