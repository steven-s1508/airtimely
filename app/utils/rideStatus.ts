import { Ride, RideWaitTimeData } from "../types/park";
import { RIDE_STATUS_ORDER, RIDE_STATUS, RideStatusType } from "../constants/rideStatus";

export const sortRidesByStatus = (ridesResponse: RideWaitTimeData | undefined): Ride[] => {
	if (!ridesResponse || !ridesResponse.data || !Array.isArray(ridesResponse.data)) {
		return [];
	}
	const rideData: Ride[] = ridesResponse.data;

	const statusOrder = RIDE_STATUS_ORDER;
	/* Sort the rides by their status according to the defined order */
	/* In each status sort alphabetically by name */
	const sortedRides = [...rideData].sort((a, b) => {
		// Create a new array before sorting
		const statusA = (a.status || RIDE_STATUS.CLOSED) as RideStatusType;
		const statusB = (b.status || RIDE_STATUS.CLOSED) as RideStatusType;
		if (statusA === statusB) {
			return (a.name || "").localeCompare(b.name || "");
		}
		return statusOrder.indexOf(statusA) - statusOrder.indexOf(statusB);
	});
	return sortedRides;
};
