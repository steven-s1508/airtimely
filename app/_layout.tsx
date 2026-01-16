import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import { ToastProvider } from "@gluestack-ui/toast";
import { usePinnedItemsStore } from "@/src/stores/pinnedItemsStore";
import { getParkChildren } from "@/src/utils/api/getParkChildren";

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

export default function RootLayout() {
	const { pinnedParks, pinnedDestinations } = usePinnedItemsStore();

	useEffect(() => {
		// Prefetch attractions for pinned parks and destinations
		const prefetchPinnedData = async () => {
			// Combine pinned parks and destinations (destinations are often parks)
			const allPinnedIds = Array.from(new Set([...pinnedParks, ...pinnedDestinations]));
			
			for (const parkId of allPinnedIds) {
				queryClient.prefetchQuery({
					queryKey: ["parkChildren", parkId],
					queryFn: () => getParkChildren(parkId),
					staleTime: 1000 * 60 * 60 * 24, // 24 hours
				});
			}
		};

		prefetchPinnedData();
	}, [pinnedParks, pinnedDestinations]);

	return (
		<GluestackUIProvider mode="light">
			<ToastProvider>
				<PersistQueryClientProvider
					client={queryClient}
					persistOptions={{ persister: asyncStoragePersistor }}
				>
					<Stack>
						<Stack.Screen name="index" options={{ headerShown: false }} />
						<Stack.Screen name="park/[parkId]" options={{ headerShown: false }} />
						<Stack.Screen name="park/[parkId]/ride/[rideId]" options={{ headerShown: false }} />
					</Stack>
				</PersistQueryClientProvider>
			</ToastProvider>
		</GluestackUIProvider>
	);
}
