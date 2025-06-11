// React / React Native Imports
import React from "react";
import { Text, StyleSheet, Pressable, View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// Local Imports
import { Icon } from "@/src/components/Icon";
import { colors, parkScreenStyles } from "@/src/styles";
import { HStack, VStack } from "./ui";
import { CountryBadge } from "./countryBadge";
import { StatusBadge } from "./statusBadge";

export function ParkHeader({ id, name }: { id: string; name: string }) {
	const router = useRouter();

	const handleBackPress = () => {
		if (router && router.canGoBack()) {
			router.back();
		} else {
			// This case might be hit if the router isn't properly initialized
			// or if there's no screen to go back to.
			console.warn("Router cannot go back or is not ready.");
			// Optionally, you could navigate to a default route here as a fallback:
			// if (router) router.replace('/');
		}
	};

	return (
		<VStack style={{ marginBottom: 8 }}>
			<HStack style={parkScreenStyles.parkScreenHeaderContainer}>
				{/* Back button */}
				<Pressable onPress={handleBackPress} android_ripple={{ color: colors.primaryTransparent, foreground: true }} style={{ backgroundColor: colors.primaryVeryDark, borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 8, padding: 8, overflow: "hidden" }}>
					<Icon name="chevronLeft" fill={colors.primaryLight} height={24} width={24} />
				</Pressable>
				<Text style={[parkScreenStyles.parkScreenHeaderTitle]}>{name}</Text>
				<Pressable /* android_ripple={{ color: colors.primaryTransparent, foreground: true }} */ style={{ backgroundColor: colors.primaryVeryDark, borderWidth: 1, borderColor: colors.primaryVeryDark, borderRadius: 8, padding: 8, overflow: "hidden" }} onPress={() => console.log("Refresh pressed")}>
					<Icon name="refresh" fill={colors.primaryBlack} height={24} width={24} />
				</Pressable>
			</HStack>
			<HStack style={parkScreenStyles.parkScreenHeaderMetadata}>
				<CountryBadge country="USA" style={parkScreenStyles.parkScreenCountryBadge} iconColor={colors.primaryLight} textColor={colors.primaryLight} />
				<StatusBadge status="Open" />
			</HStack>
			<View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 100, marginHorizontal: 16 }}>
				{/* Placeholder for park information */}
				<Text style={{ color: colors.primary }}>Show Info</Text>
				<Icon name="expand" fill={colors.primary} height={16} width={16} />
			</View>
		</VStack>
	);
}
