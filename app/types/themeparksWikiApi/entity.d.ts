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

// Defines the structure of entity data (parks)
export interface EntityData {
	id: string;
	name: string;
	slug: string;
	location?: EntityLocation | null;
	parentId?: string | null;
	timezone: string;
	entityType: EntityType;
	destinationId?: string | null;
	externalId?: string | null;
	tags?: TagData[];
}
