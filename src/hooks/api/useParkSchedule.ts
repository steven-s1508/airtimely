import { useQuery } from "@tanstack/react-query";
import { getParkSchedule, type ParkScheduleResponse } from "@/src/utils/api/getParkSchedule";
import { queryKeys } from "@/src/utils/queryKeys";

export function useParkSchedule(parkId: string) {
	return useQuery<ParkScheduleResponse | null>({
		queryKey: queryKeys.parkSchedule(parkId),
		queryFn: () => getParkSchedule(parkId),
		enabled: !!parkId,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
	});
}
