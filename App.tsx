// React / React Native Imports
import React from "react";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
// Expo Imports
import "expo-dev-client";
import { StatusBar } from "expo-status-bar";
import { ExpoRoot } from "expo-router";
// Gluestack UI Imports
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import { ToastProvider } from "@gluestack-ui/toast";
// 3rd Party Imports
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Local Imports
import { CACHE_TIME_STALE_LONG } from "./src/constants/apiConfig";
import "@/global.css";

// Create the client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnReconnect: true,
			refetchOnWindowFocus: false,
		},
	},
});

const asyncStoragePersistor = createAsyncStoragePersister({
	storage: AsyncStorage,
});

// Persist the cache
persistQueryClient({
	queryClient,
	persister: asyncStoragePersistor,
	maxAge: CACHE_TIME_STALE_LONG, // 24 hours max cache age (fallback, overridden per-query)
});

export default function App() {
	const ctx = require.context("./app");

	return (
		<SafeAreaProvider initialMetrics={initialWindowMetrics}>
			<SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
				<GluestackUIProvider mode="light">
					<ToastProvider>
						<QueryClientProvider client={queryClient}>
							<ExpoRoot context={ctx} />
						</QueryClientProvider>
					</ToastProvider>
				</GluestackUIProvider>
				<StatusBar style="auto" />
			</SafeAreaView>
		</SafeAreaProvider>
	);
}
