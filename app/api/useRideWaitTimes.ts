// 3rd party imports
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
// Local imports
import { Ride, RideWaitTimeData } from "../types/park";
import { API_BASE_URL, CACHE_TIME_STALE_DEFAULT, CACHE_TIME_GC_DEFAULT, REFETCH_INTERVAL_MEDIUM } from "../constants/apiConfig";

export const useRideWaitTimes = (parkId: string | null) => {
	// Allow parkId to be null initially
	return useQuery<RideWaitTimeData, Error>({
		queryKey: ["rideTimes", parkId],
		queryFn: async () => {
			if (!parkId) throw new Error("Park ID is required"); // Should not happen if enabled is false
			const res = await axios.get<Ride[]>(`${API_BASE_URL}/waitingtimes`, {
				headers: {
					park: parkId,
					language: "en",
				},
			});
			return {
				data: res.data,
				fetchedAt: new Date().toISOString(),
			};
		},
		staleTime: CACHE_TIME_STALE_DEFAULT,
		gcTime: CACHE_TIME_GC_DEFAULT,
		refetchInterval: REFETCH_INTERVAL_MEDIUM,
		enabled: !!parkId, // Only run query if parkId is a non-empty string
	});
};
