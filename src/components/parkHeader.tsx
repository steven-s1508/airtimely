// React / React Native Imports
import React from "react";
import { Text } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// Local Imports
import { Icon } from "@/src/components/Icon";
import { colors, parkScreenStyles } from "@/src/styles";
import { HStack, VStack } from "./ui";
import { CountryBadge } from "./countryBadge";
import { StatusBadge } from "./statusBadge";
import { useParkStatus } from "@/src/hooks/api/useParkStatus";
import { ParkInfo } from "./parkInfo";
import { SkeletonParkHeader } from "@components/skeletons/skeletonParkHeader";
import { HeaderActionButton } from "./headerActionButton";

export const ParkHeader = React.memo(function ParkHeader({ item: { id, name, country_code }, onRefresh, isRefreshing = false, lastUpdatedText }: { item: { id: string; name: string; country_code: string }; onRefresh?: () => void; isRefreshing?: boolean; lastUpdatedText?: string | null }) {
	const router = useRouter();
	const { data: status = "Unknown", isLoading: isLoadingStatus } = useParkStatus(id);

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
				<HeaderActionButton icon="chevronLeft" label="Go back" onPress={handleBackPress} />
				<Text style={[parkScreenStyles.parkScreenHeaderTitle]}>{name}</Text>
				<HeaderActionButton icon="refresh" label={isRefreshing ? "Refreshing park data" : "Refresh park data"} onPress={handleRefreshPress} disabled={isRefreshing}>
					<Icon
						name="refresh"
						fill={colors.primaryLight}
						height={24}
						width={24}
						style={{
							transform: [{ rotate: isRefreshing ? "180deg" : "0deg" }],
						}}
					/>
				</HeaderActionButton>
			</HStack>
			<HStack style={{ justifyContent: "space-between", alignItems: "center", flexDirection: "row" }}>
				<HStack style={parkScreenStyles.parkScreenHeaderMetadata}>
					<CountryBadge country={country_code} status={status} isPark />
					<StatusBadge status={status} type="round"/>
				</HStack>
				{lastUpdatedText && (
					<HStack style={{ justifyContent: "center", alignItems: "center", gap: 4, paddingBottom: 4, flexDirection: "row", marginRight: 16 }}>
						<Icon name="clock" fill={colors.primaryLight} height={12} width={12} />
						<Text style={{ color: colors.primaryLight, fontSize: 11, fontStyle: "italic" }}>
							Last updated: {lastUpdatedText}
						</Text>
					</HStack>
				)}
			</HStack>
			<ParkInfo parkId={id} />
		</VStack>
	);
});
