import { useQuery } from "@tanstack/react-query";
import { getParkStatus, type ParkStatus } from "@/src/utils/api/getParkStatus";

export function useParkStatus(parkId: string) {
	return useQuery<ParkStatus>({
		queryKey: ["parkStatus", parkId],
		queryFn: () => getParkStatus(parkId),
		enabled: !!parkId,
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
	});
}
