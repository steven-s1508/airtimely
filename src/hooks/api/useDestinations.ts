import { useQuery } from "@tanstack/react-query";
import { fetchDisplayableEntities, type DisplayableEntity } from "@/src/utils/api/getDisplayableEntities";
import { queryKeys } from "@/src/utils/queryKeys";

export function useDestinations() {
	return useQuery<DisplayableEntity[]>({
		queryKey: queryKeys.destinations(),
		queryFn: fetchDisplayableEntities,
		staleTime: 1000 * 60 * 30, // 30 minutes - data considered fresh
		refetchInterval: 1000 * 60 * 30, // Auto-refetch every 30 minutes
		gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
	});
}
