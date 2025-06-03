// 3rd party imports
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
// Local imports
import { Park } from "../types/park";
import { API_BASE_URL, CACHE_TIME_STALE_LONG, CACHE_TIME_GC_LONG } from "../constants/apiConfig";

export const useParks = () => {
	return useQuery<Park[], Error>({
		queryKey: ["parks"],
		queryFn: async () => {
			const res = await axios.get<Park[]>(`${API_BASE_URL}/parks`, {
				headers: { language: "en" },
			});
			return res.data;
		},
		staleTime: CACHE_TIME_STALE_LONG,
		gcTime: CACHE_TIME_GC_LONG,
	});
};
