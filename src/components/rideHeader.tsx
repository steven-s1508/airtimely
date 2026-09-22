// React / React Native Imports
import React from "react";
import { Text, View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// 3rd Party Imports
// Local Imports
import { Icon } from "@/src/components/Icon";
import { colors, rideScreenStyles } from "@/src/styles";
import { HStack, VStack } from "./ui";
import { HeaderActionButton } from "./headerActionButton";
import { RideStatusWaitRow, getRideStatusKey } from "@/src/components/rideStatusWaitRow";

export const RideHeader = React.memo(function RideHeader({ parkName, item: { name }, waitTime, singleRiderWaitTime, status, onRefresh, isRefreshing = false }: { parkName?: string | null; item: { id: string; name: string }; waitTime?: number | null; singleRiderWaitTime?: number | null; status?: string | null; onRefresh?: () => void; isRefreshing?: boolean }) {
	const router = useRouter();

	const statusKey = getRideStatusKey(status);

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

	return (
		<VStack>
			<HStack style={rideScreenStyles.rideScreenHeaderContainer}>
				{/* Back button */}
				<HeaderActionButton icon="chevronLeft" label="Go back" onPress={handleBackPress} />
				<VStack style={{ flex: 1 }}>
					{parkName && <Text style={[rideScreenStyles.rideScreenHeaderTitle, { fontSize: 14, fontWeight: "medium" }]}>{parkName}</Text>}
					<Text style={[rideScreenStyles.rideScreenHeaderTitle]}>{name}</Text>
				</VStack>
				<HeaderActionButton icon="refresh" label={isRefreshing ? "Refreshing ride data" : "Refresh ride data"} onPress={handleRefreshPress} disabled={isRefreshing}>
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
			<HStack style={rideScreenStyles.rideScreenHeaderMetadata}>
				<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
				<HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, width: "100%" }}>
					<RideStatusWaitRow statusKey={statusKey} waitTime={waitTime ?? 0} variant="pill" />
					{singleRiderWaitTime !== undefined && singleRiderWaitTime !== null && (
						<RideStatusWaitRow statusKey={statusKey} waitType="singleRider" waitTime={singleRiderWaitTime} variant="pill" />
					)}
				</HStack>
			</HStack>
		</VStack>
	);
});
