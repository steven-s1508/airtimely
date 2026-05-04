import { useQuery } from "@tanstack/react-query";
import { getParkSchedule, type ParkScheduleResponse } from "@/src/utils/api/getParkSchedule";

export function useParkSchedule(parkId: string) {
	return useQuery<ParkScheduleResponse | null>({
		queryKey: ["parkSchedule", parkId],
		queryFn: () => getParkSchedule(parkId),
		enabled: !!parkId,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
	});
}
