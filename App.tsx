// React / React Native Imports
import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
// Expo Imports
import "expo-dev-client";
// Gluestack UI Imports
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ToastProvider } from "@gluestack-ui/toast";
// 3rd Party Imports
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Local Imports
import { CACHE_TIME_STALE_LONG } from "./app/constants/apiConfig";
import Navigation from "./app/navigation";
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
	return (
		<SafeAreaProvider initialMetrics={initialWindowMetrics}>
			<GluestackUIProvider mode="light">
				<ToastProvider>
					<QueryClientProvider client={queryClient}>
						<Navigation />
					</QueryClientProvider>
				</ToastProvider>
			</GluestackUIProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
});
