import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/supabase";

export function useChildParks(destinationIds: string[]) {
	return useQuery<Tables<"parks">[]>({
		queryKey: ["childParks", destinationIds.sort()],
		queryFn: async () => {
			if (destinationIds.length === 0) return [];
			const { data, error } = await supabase
				.from("parks")
				.select("*")
				.in("destination_id", destinationIds)
				.neq("is_destination", true);

			if (error) throw error;
			return data || [];
		},
		enabled: destinationIds.length > 0,
		staleTime: 1000 * 60 * 30, // 30 minutes - data considered fresh
		refetchInterval: 1000 * 60 * 30, // Auto-refetch every 30 minutes
		gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
	});
}
