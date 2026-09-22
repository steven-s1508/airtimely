import { useQuery } from "@tanstack/react-query";
import { getAppConfig, type AppConfig } from "@/src/utils/api/getAppConfig";
import { queryKeys } from "@/src/utils/queryKeys";

export function useAppConfig() {
	return useQuery<AppConfig>({
		queryKey: queryKeys.appConfig(),
		queryFn: getAppConfig,
		staleTime: 1000 * 60 * 60, // 1 hour
		refetchInterval: 1000 * 60 * 60, // Pick up a raised minimum without a restart
		gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
	});
}
