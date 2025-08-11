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
import { getParkStatus, ParkStatus } from "@/src/utils/api/getParkStatus";
import { ParkInfo } from "./parkInfo";
import { SkeletonParkHeader } from "@components/skeletons/skeletonParkHeader";

export const ParkHeader = React.memo(function ParkHeader({ item: { id, name, country_code }, onRefresh, isRefreshing = false }: { item: { id: string; name: string; country_code: string }; onRefresh?: () => void; isRefreshing?: boolean }) {
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
			console.warn("Router cannot go back or is not ready.");
		}
	};

	const handleRefreshPress = () => {
		if (onRefresh && !isRefreshing) {
			onRefresh();
		}
	};

	if (!id || !name) {
		return <SkeletonParkHeader />;
	}

	if (isLoadingStatus) {
		return <SkeletonParkHeader />;
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
});
