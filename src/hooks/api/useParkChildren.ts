import { useQuery } from "@tanstack/react-query";
import { getParkChildren, type ParkChildrenResponse } from "@/src/utils/api/getParkChildren";

export function useParkChildren(parkId: string) {
	return useQuery<ParkChildrenResponse | null>({
		queryKey: ["parkChildren", parkId],
		queryFn: () => getParkChildren(parkId),
		enabled: !!parkId,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
	});
}
