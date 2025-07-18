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
import "@/global.css";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://6b0f32656686e9fac81b79fd9895f86a@o4509559614078976.ingest.de.sentry.io/4509559630921808',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

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
	maxAge: 1000 * 60 * 60 * 24, // 24 hours max cache age (fallback, overridden per-query)
});

export default Sentry.wrap(function App() {
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
			</SafeAreaView>
		</SafeAreaProvider>
	);
});