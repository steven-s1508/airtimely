export enum SchedulePriceObjectType {
	ADMISSION = "ADMISSION",
	PACKAGE = "PACKAGE",
	ATTRACTION = "ATTRACTION",
}

export interface SchedulePriceObject {
	type?: SchedulePriceObjectType | null;
	id?: string;
	name?: string;
	price?: PriceData;
	available?: boolean;
}

export enum ScheduleEntryType {
	OPERATING = "OPERATING",
	TICKETED_EVENT = "TICKETED_EVENT",
	PRIVATE_EVENT = "PRIVATE_EVENT",
	EXTRA_HOURS = "EXTRA_HOURS",
	INFO = "INFO",
}

export interface ScheduleEntry {
	date: string; // YYYY-MM-DD
	type: ScheduleEntryType;
	purchases?: SchedulePriceObject[];
	closingTime: string; // date-time
	openingTime: string; // date-time
}

export interface EntityScheduleResponse {
	id?: string;
	name?: string;
	entityType?: EntityType;
	timezone?: string;
	schedule?: ScheduleEntry[];
	parks?: EntityScheduleResponse[]; // Recursive definition
}
