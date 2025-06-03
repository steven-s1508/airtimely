export const RIDE_STATUS = {
	OPENED: "opened", // As used in RideListItem, ensure this matches API or unify
	VIRTUALQUEUE: "virtualqueue", // Added for virtual queue status
	MAINTENANCE: "maintenance",
	CLOSED_ICE: "closedice",
	CLOSED_WEATHER: "closedweather",
	CLOSED: "closed",
} as const;

export type RideStatusType = (typeof RIDE_STATUS)[keyof typeof RIDE_STATUS];

export const RIDE_STATUS_ORDER: RideStatusType[] = [RIDE_STATUS.OPENED, RIDE_STATUS.VIRTUALQUEUE, RIDE_STATUS.MAINTENANCE, RIDE_STATUS.CLOSED_ICE, RIDE_STATUS.CLOSED_WEATHER, RIDE_STATUS.CLOSED];
