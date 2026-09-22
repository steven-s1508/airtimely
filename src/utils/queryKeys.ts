export const queryKeys = {
	parkChildren: (parkId?: string) => (parkId ? ["parkChildren", parkId] : ["parkChildren"]),
	parkSchedule: (parkId?: string) => (parkId ? ["parkSchedule", parkId] : ["parkSchedule"]),
	parkStatus: (parkId?: string) => (parkId ? ["parkStatus", parkId] : ["parkStatus"]),
	destinations: () => ["destinations"],
	appConfig: () => ["appConfig"],
	rideStatistics: (rideId?: string) => (rideId ? ["rideStatistics", rideId] : ["rideStatistics"]),
	liveRideStatistics: (rideId: string) => ["rideStatistics", rideId, "live"],
	hourlyAverageWaitTimes: (rideId: string) => ["rideStatistics", rideId, "hourlyAverage"],
	monthlyAverageWaitTimes: (rideId: string) => ["rideStatistics", rideId, "monthlyAverage"],
	weekdayAverageWaitTimes: (rideId: string) => ["rideStatistics", rideId, "weekdayAverage"],
	weekdayAverageWaitTimesByYear: (rideId: string, year: number) => ["rideStatistics", rideId, "weekdayAverage", year],
} as const;