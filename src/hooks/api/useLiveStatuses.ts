import { useQuery } from "@tanstack/react-query";
import { getBulkParkStatus } from "@/src/utils/api/getBulkParkStatus";
import type { ParkStatus } from "@/src/utils/api/getParkStatus";

export function useLiveStatuses(parkIds: string[]) {
	return useQuery<Record<string, ParkStatus>>({
		queryKey: ["liveStatuses", parkIds.sort()], // Sort to ensure stable query key
		queryFn: () => getBulkParkStatus(parkIds),
		enabled: parkIds.length > 0,
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
	});
}
