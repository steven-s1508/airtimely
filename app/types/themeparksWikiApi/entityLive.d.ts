export enum LiveStatusType {
	OPERATING = "OPERATING",
	DOWN = "DOWN",
	CLOSED = "CLOSED",
	REFURBISHMENT = "REFURBISHMENT",
}

export enum ReturnTimeState {
	AVAILABLE = "AVAILABLE",
	TEMP_FULL = "TEMP_FULL",
	FINISHED = "FINISHED",
}

export enum BoardingGroupState {
	AVAILABLE = "AVAILABLE",
	PAUSED = "PAUSED",
	CLOSED = "CLOSED",
}

export interface PriceData {
	amount: number;
	currency: string;
	formatted?: string;
}

export interface LiveQueue {
	STANDBY?: {
		waitTime?: number | null;
	};
	SINGLE_RIDER?: {
		waitTime: number | null;
	};
	RETURN_TIME?: {
		state: ReturnTimeState;
		returnStart: string | null; // date-time
		returnEnd: string | null; // date-time
	};
	PAID_RETURN_TIME?: {
		state: ReturnTimeState;
		returnStart: string | null; // date-time
		returnEnd: string | null; // date-time
		price: PriceData;
	};
	BOARDING_GROUP?: {
		allocationStatus: BoardingGroupState;
		currentGroupStart: number | null;
		currentGroupEnd: number | null;
		nextAllocationTime: string | null; // date-time
		estimatedWait: number | null;
	};
	PAID_STANDBY?: {
		waitTime: number | null;
	};
}

export interface LiveShowTime {
	type: string;
	startTime?: string | null; // date-time
	endTime?: string | null; // date-time
}

export interface DiningAvailability {
	partySize?: number | null;
	waitTime?: number | null;
}

export interface EntityLiveData {
	id: string;
	name: string;
	entityType: EntityType;
	parkId?: string | null; // ID of the park this entity belongs to
	externalId?: string | null; // External ID for the entity
	status?: LiveStatusType;
	lastUpdated: string; // date-time
	queue?: LiveQueue;
	showtimes?: LiveShowTime[];
	operatingHours?: LiveShowTime[];
	diningAvailability?: DiningAvailability[];
}

export interface EntityLiveDataResponse {
	id?: string;
	name?: string;
	entityType?: EntityType;
	timezone?: string;
	liveData?: EntityLiveData[];
}
