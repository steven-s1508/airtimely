import { useQuery } from "@tanstack/react-query";
import { getAllTimeAverageHourlyWaitTimes, getLiveRideStatistics, getMonthlyAverageWaitTimes, getWeekdayAverageWaitTimes, getWeekdayAverageWaitTimesByYear } from "@/src/utils/api/getRideStatistics";
import { queryKeys } from "@/src/utils/queryKeys";

export function useLiveRideStatistics(rideId: string) {
	return useQuery({
		queryKey: queryKeys.liveRideStatistics(rideId),
		queryFn: () => getLiveRideStatistics(rideId),
		enabled: !!rideId,
		staleTime: 1000 * 60 * 5,
		refetchInterval: 1000 * 60 * 5,
	});
}

export function useHourlyAverageWaitTimes(rideId: string) {
	return useQuery({
		queryKey: queryKeys.hourlyAverageWaitTimes(rideId),
		queryFn: () => getAllTimeAverageHourlyWaitTimes(rideId),
		enabled: !!rideId,
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 60 * 24 * 7,
	});
}

export function useMonthlyAverageWaitTimes(rideId: string) {
	return useQuery({
		queryKey: queryKeys.monthlyAverageWaitTimes(rideId),
		queryFn: () => getMonthlyAverageWaitTimes(rideId),
		enabled: !!rideId,
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 60 * 24 * 7,
	});
}

export function useWeekdayAverageWaitTimes(rideId: string) {
	return useQuery({
		queryKey: queryKeys.weekdayAverageWaitTimes(rideId),
		queryFn: () => getWeekdayAverageWaitTimes(rideId),
		enabled: !!rideId,
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 60 * 24 * 7,
	});
}

export function useWeekdayAverageWaitTimesByYear(rideId: string, year: number) {
	return useQuery({
		queryKey: queryKeys.weekdayAverageWaitTimesByYear(rideId, year),
		queryFn: () => getWeekdayAverageWaitTimesByYear(rideId, year),
		enabled: !!rideId && Number.isInteger(year),
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 60 * 24 * 7,
	});
}
