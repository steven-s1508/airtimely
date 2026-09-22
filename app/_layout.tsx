import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { AppState, Platform, useColorScheme } from "react-native";
import { QueryClient, focusManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import { usePinnedItemsStore } from "@/src/stores/pinnedItemsStore";
import { getParkChildren } from "@/src/utils/api/getParkChildren";
import { queryKeys } from "@/src/utils/queryKeys";
import { ForceUpdateGate } from "@/src/components/forceUpdateGate";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
			refetchOnReconnect: true,
			refetchOnWindowFocus: false,
		},
	},
});

const asyncStoragePersistor = createAsyncStoragePersister({
	storage: AsyncStorage,
});

/**
 * Discards the persisted query cache whenever it may hold payloads of another shape.
 *
 * The app version covers a new build; the API generation covers JS-only updates that
 * change a payload without a version bump — bump it whenever a cached shape changes.
 * Without this, Supabase-era payloads restored from AsyncStorage crash the first launch
 * of the new build.
 */
const CACHE_GENERATION = "api-v2";
const persistBuster = `${Constants.expoConfig?.version ?? "0.0.0"}:${CACHE_GENERATION}`;

/** Matches the longest gcTime in the hooks; anything older is not worth restoring. */
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7;


export default function RootLayout() {
	const { pinnedParks, pinnedDestinations } = usePinnedItemsStore();
	const colorScheme = useColorScheme();
	
	// Connect React Query to app state for proper refetchInterval behavior
	useEffect(() => {
		const onAppStateChange = (status: string) => {
			if (Platform.OS !== "web") {
				focusManager.setFocused(status === "active");
			}
		};
		const subscription = AppState.addEventListener("change", onAppStateChange);
		return () => subscription.remove();
	}, []);

	useEffect(() => {
		// Prefetch attractions for pinned parks and destinations
		const prefetchPinnedData = async () => {
			// Combine pinned parks and destinations (destinations are often parks)
			const allPinnedIds = Array.from(new Set([...pinnedParks, ...pinnedDestinations]));
			
			for (const parkId of allPinnedIds) {
				queryClient.prefetchQuery({
					queryKey: queryKeys.parkChildren(parkId),
					queryFn: () => getParkChildren(parkId),
					staleTime: 1000 * 60 * 5, // 5 minutes - match useParkChildren hook
				});
			}
		};

		prefetchPinnedData();
	}, [pinnedParks, pinnedDestinations]);

	return (
		<GluestackUIProvider mode={colorScheme ?? "light"}>
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={{ persister: asyncStoragePersistor, buster: persistBuster, maxAge: PERSIST_MAX_AGE }}
			>
				<ForceUpdateGate>
					<Stack>
						<Stack.Screen name="index" options={{ headerShown: false }} />
						<Stack.Screen name="park/[parkId]" options={{ headerShown: false }} />
						<Stack.Screen name="park/[parkId]/ride/[rideId]" options={{ headerShown: false }} />
					</Stack>
				</ForceUpdateGate>
			</PersistQueryClientProvider>
		</GluestackUIProvider>
	);
}
