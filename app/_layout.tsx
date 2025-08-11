import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="park/[parkId]" options={{ headerShown: false }} />
			<Stack.Screen name="park/[parkId]/ride/[rideId]" options={{ headerShown: false }} />
		</Stack>
	);
}
