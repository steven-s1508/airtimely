import { useQuery } from "@tanstack/react-query";
import { getBulkParkStatus } from "@/src/utils/api/getBulkParkStatus";
import type { ParkStatus } from "@/src/utils/api/getParkStatus";

export function useLiveStatuses(parkIds: string[]) {
	return useQuery<Record<string, ParkStatus>>({
		queryKey: ["liveStatuses", parkIds.sort()], // Sort to ensure stable query key
		queryFn: () => getBulkParkStatus(parkIds),
		enabled: parkIds.length > 0,
		staleTime: 1000 * 60 * 30, // 30 minutes - data considered fresh
		refetchInterval: 1000 * 60 * 30, // Auto-refetch every 30 minutes
	});
}
