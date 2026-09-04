export const queryKeys = {
	parkChildren: (parkId?: string) => (parkId ? ["parkChildren", parkId] : ["parkChildren"]),
	parkSchedule: (parkId?: string) => (parkId ? ["parkSchedule", parkId] : ["parkSchedule"]),
	parkStatus: (parkId?: string) => (parkId ? ["parkStatus", parkId] : ["parkStatus"]),
	destinations: () => ["destinations"],
	childParks: (destinationIds?: readonly string[]) => (destinationIds ? ["childParks", [...destinationIds].sort()] : ["childParks"]),
	liveStatuses: (parkIds?: readonly string[]) => (parkIds ? ["liveStatuses", [...parkIds].sort()] : ["liveStatuses"]),
	rideStatistics: (rideId?: string) => (rideId ? ["rideStatistics", rideId] : ["rideStatistics"]),
	liveRideStatistics: (rideId: string) => ["rideStatistics", rideId, "live"],
	hourlyAverageWaitTimes: (rideId: string) => ["rideStatistics", rideId, "hourlyAverage"],
	monthlyAverageWaitTimes: (rideId: string) => ["rideStatistics", rideId, "monthlyAverage"],
	weekdayAverageWaitTimes: (rideId: string) => ["rideStatistics", rideId, "weekdayAverage"],
} as const;