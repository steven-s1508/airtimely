// React / React Native Imports
import React, { useState, useEffect } from "react";
import { Text, Pressable } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// Local Imports
import { Icon } from "@/src/components/Icon";
import { colors, parkScreenStyles } from "@/src/styles";
import { HStack, VStack } from "./ui";
import { CountryBadge } from "./countryBadge";
import { StatusBadge } from "./statusBadge";
import { getParkStatus, ParkStatus } from "@/app/api/get/getParkStatus";
import { ParkInfo } from "./parkInfo";
import populateShowTimes from "@/app/api/populateShowTimes";

export function ParkHeader({ item: { id, name, country_code }, onRefresh, isRefreshing = false }: { item: { id: string; name: string; country_code: string }; onRefresh?: () => void; isRefreshing?: boolean }) {
	const router = useRouter();
	const [status, setStatus] = useState<ParkStatus>("Unknown");
	const [isLoadingStatus, setIsLoadingStatus] = useState(true);

	useEffect(() => {
		const loadStatus = async () => {
			setIsLoadingStatus(true);
			const status = await getParkStatus(id);
			setStatus(status);
			setIsLoadingStatus(false);
		};
		loadStatus();
	}, [id]);

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

	const handleRefreshPress = () => {
		if (onRefresh && !isRefreshing) {
			onRefresh();
		}
	};

	if (!id || !name) {
		return <Text style={{ color: colors.primaryLight }}>Loading...</Text>;
	}

	if (isLoadingStatus) {
		return <Text style={{ color: colors.primaryLight }}>Loading status...</Text>;
	}

	return (
		<VStack>
			<HStack style={parkScreenStyles.parkScreenHeaderContainer}>
				{/* Back button */}
				<Pressable onPress={handleBackPress} android_ripple={{ color: colors.primaryTransparent, foreground: true }} style={{ backgroundColor: colors.primaryVeryDark, borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 8, padding: 8, overflow: "hidden" }}>
					<Icon name="chevronLeft" fill={colors.primaryLight} height={24} width={24} />
				</Pressable>
				<Text style={[parkScreenStyles.parkScreenHeaderTitle]}>{name}</Text>
				<Pressable
					onPress={handleRefreshPress}
					disabled={isRefreshing}
					android_ripple={{ color: colors.primaryTransparent, foreground: true }}
					style={{
						backgroundColor: colors.primaryVeryDark,
						borderWidth: 1,
						borderColor: colors.primaryDark,
						borderRadius: 8,
						padding: 8,
						overflow: "hidden",
						opacity: isRefreshing ? 0.6 : 1,
					}}
				>
					<Icon
						name="refresh"
						fill={colors.primaryLight}
						height={24}
						width={24}
						style={{
							transform: [{ rotate: isRefreshing ? "180deg" : "0deg" }],
						}}
					/>
				</Pressable>
			</HStack>
			<HStack style={parkScreenStyles.parkScreenHeaderMetadata}>
				<CountryBadge country={country_code} status={status} isPark />
				<StatusBadge status={status} />
			</HStack>
			<ParkInfo parkId={id} />
		</VStack>
	);
}
