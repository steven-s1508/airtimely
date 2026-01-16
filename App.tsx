// React / React Native Imports
import React from "react";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
// Expo Imports
import "expo-dev-client";
import { ExpoRoot } from "expo-router";
// Local Imports
import "./global.css";
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

export default Sentry.wrap(function App() {
	const ctx = require.context("./app");

	return (
		<SafeAreaProvider initialMetrics={initialWindowMetrics}>
			<SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
				<ExpoRoot context={ctx} />
			</SafeAreaView>
		</SafeAreaProvider>
	);
});
