// React / React Native Imports
import React, { useState, useEffect } from "react";
import { Text, Pressable, View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// 3rd Party Imports
// Local Imports
import { supabase } from "@/src/utils/supabase";
import { Icon } from "@/src/components/Icon";
import { colors, rideScreenStyles } from "@/src/styles";
import { HStack, VStack } from "./ui";
/* import { RideStatusBadge } from "./rideStatusBadge"; */

async function fetchParkName(parkId: string) {
	const { data: parkName, error } = await supabase.from("parks").select("name").eq("id", parkId).single();

	if (error) {
		console.error("Error fetching park name:", error);
		return null;
	}

	return parkName;
}

export const RideHeader = React.memo(function RideHeader({ parkId, item: { id, name }, waitTime, singleRiderWaitTime, status, onRefresh, isRefreshing = false }: { parkId: string; item: { id: string; name: string }; waitTime?: number | null; singleRiderWaitTime?: number | null; status?: string | null; onRefresh?: () => void; isRefreshing?: boolean }) {
	const router = useRouter();
	const [isLoadingStatus, setIsLoadingStatus] = useState(true);
	const [parkName, setParkName] = useState<{ name: string } | null>(null);

	useEffect(() => {
		const loadParkName = async () => {
			const fetchedParkName = await fetchParkName(parkId);
			setParkName(fetchedParkName);
		};

		loadParkName();
	}, [parkId]);

	useEffect(() => {
		const loadStatus = async () => {
			setIsLoadingStatus(true);
			setIsLoadingStatus(false);
		};
		loadStatus();
	}, [id]);

	const getWaitTimeStyles = (displayWaitTime: number) => {
		if (displayWaitTime < 45) {
			return {
				statusBackgroundColor: colors.primaryVeryDark,
				statusBorderColor: colors.primaryLight,
				waitTimeTextColor: colors.primaryLight,
			};
		} else if (displayWaitTime < 60) {
			return {
				statusBackgroundColor: colors.accentVeryDark,
				statusBorderColor: colors.accentLight,
				waitTimeTextColor: colors.accentLight,
			};
		} else {
			return {
				statusBackgroundColor: colors.highWaitingtimeVeryDark,
				statusBorderColor: colors.highWaitingtimeVeryLight,
				waitTimeTextColor: colors.highWaitingtimeVeryLight,
			};
		}
	};

	const getStyling = (statusValue: string | null | undefined, waitStyles: any) => {
		const normalizedStatus = statusValue?.toLowerCase();

		switch (normalizedStatus) {
			case "operating":
				return {
					containerColor: colors.primaryVeryDark,
					containerBorderColor: colors.primary,
					rideNameColor: colors.primaryWhite,
					statusContainerColor: colors.primaryDark,
					leftIconColor: colors.primaryLight,
					statusTextColor: colors.primaryVeryLight,
					statusBackgroundColor: waitStyles.statusBackgroundColor,
					statusBorderColor: waitStyles.statusBorderColor,
					waitTimeTextColor: waitStyles.waitTimeTextColor,
					vqIconColor: colors.primaryLight,
					vqTextColor: colors.primaryVeryLight,
					statusText: "Standby Wait",
				};
			case "down":
				return {
					containerColor: "#211213",
					containerBorderColor: "#A3000E",
					rideNameColor: "#FFCCD9",
					statusContainerColor: "#3D1215",
					leftIconColor: "#FFCCD9",
					statusTextColor: "#FFCCD9",
					statusBorderColor: "#A3000E",
					statusBackgroundColor: "#FFCCD9",
					statusIconColor: "#A3000E",
					statusText: "Down",
				};
			case "closed":
				return {
					containerColor: colors.secondaryVeryDark,
					containerBorderColor: colors.secondary,
					rideNameColor: colors.secondaryVeryLight,
					statusContainerColor: colors.secondaryDark,
					leftIconColor: colors.secondaryVeryLight,
					statusTextColor: colors.secondaryVeryLight,
					statusBorderColor: colors.secondaryLight,
					statusBackgroundColor: colors.secondaryLight,
					statusIconColor: colors.secondaryBlack,
					statusText: "Closed",
				};
			case "refurbishment":
				return {
					containerColor: colors.accentBlack,
					containerBorderColor: colors.accent,
					rideNameColor: colors.accentVeryLight,
					statusContainerColor: colors.accentVeryDark,
					leftIconColor: colors.accentLight,
					statusTextColor: colors.accentLight,
					statusBorderColor: colors.accent,
					statusBackgroundColor: colors.accent,
					statusIconColor: colors.accentBlack,
					statusText: "Refurbishment",
				};
			default:
				return {
					containerColor: colors.primaryVeryDark,
					containerBorderColor: colors.primary,
					textColor: colors.primaryLight,
					headerColor: colors.primaryDark,
				};
		}
	};

	const getStatusView = (waitType: string = "standby") => {
		// Normalize the status to lowercase
		const normalizedStatus = status?.toLowerCase();

		// Determine the wait time to display based on wait type
		let waitTimeToDisplay;
		if (waitType === "standby") {
			waitTimeToDisplay = waitTime !== undefined && waitTime !== null ? waitTime : 0;
		} else if (waitType === "singleRider") {
			waitTimeToDisplay = singleRiderWaitTime !== undefined && singleRiderWaitTime !== null ? singleRiderWaitTime : 0;
		}

		const waitStyles = getWaitTimeStyles(waitTimeToDisplay || 0);
		const styling = getStyling(status, waitStyles);

		if (normalizedStatus === "operating" || normalizedStatus === "open") {
			return (
				<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: waitType === "singleRider" ? waitStyles.statusBackgroundColor : styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: waitType === "singleRider" ? waitStyles.statusBorderColor : styling.statusBorderColor }}>
					<Text style={{ color: waitType === "singleRider" ? waitStyles.waitTimeTextColor : styling.waitTimeTextColor, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTimeToDisplay}</Text>
				</View>
			);
		} else if (normalizedStatus === "down") {
			return (
				<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
					<Icon name="down" fill={styling.statusIconColor} height={24} width={24} />
				</View>
			);
		} else if (normalizedStatus === "closed") {
			return (
				<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
					<Icon name="closed" fill={styling.statusIconColor} height={24} width={24} />
				</View>
			);
		} else if (normalizedStatus === "refurbishment") {
			return (
				<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
					<Icon name="refurbishment" fill={styling.statusIconColor} height={24} width={24} />
				</View>
			);
		}

		// Default case - show wait time
		return (
			<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
				<Text style={{ color: styling.waitTimeTextColor, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTimeToDisplay}</Text>
			</View>
		);
	};

	const waitStyles = getWaitTimeStyles(waitTime || 0);
	const styling = getStyling(status, waitStyles);

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

	// Handle loading status in the render logic instead of early return
	if (isLoadingStatus) {
		return <Text style={{ color: colors.primaryLight }}>Loading status...</Text>;
	}

	return (
		<VStack>
			<HStack style={rideScreenStyles.rideScreenHeaderContainer}>
				{/* Back button */}
				<Pressable onPress={handleBackPress} android_ripple={{ color: colors.primaryTransparent, foreground: true }} style={{ backgroundColor: colors.primaryVeryDark, borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 8, padding: 8, overflow: "hidden" }}>
					<Icon name="chevronLeft" fill={colors.primaryLight} height={24} width={24} />
				</Pressable>
				<VStack style={{ flex: 1 }}>
					{parkName && <Text style={[rideScreenStyles.rideScreenHeaderTitle, { fontSize: 14, fontWeight: "medium" }]}>{parkName.name}</Text>}
					<Text style={[rideScreenStyles.rideScreenHeaderTitle]}>{name}</Text>
				</VStack>
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
			<HStack style={rideScreenStyles.rideScreenHeaderMetadata}>
				<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
				<HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, width: "100%" }}>
					<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
						<Icon name="waitTime" fill={styling.leftIconColor} height={24} width={24} />
						<Text style={{ color: styling.statusTextColor, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>{styling.statusText}</Text>
						{getStatusView("standby")}
					</HStack>
					{singleRiderWaitTime !== undefined && singleRiderWaitTime !== null && (
						<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
							<Icon name="singleRider" fill={colors.primaryLight} height={24} width={24} />
							<Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Single Rider</Text>
							{getStatusView("singleRider")}
						</HStack>
					)}
				</HStack>
			</HStack>
		</VStack>
	);
});
