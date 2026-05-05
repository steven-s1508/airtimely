// React / React Native Imports
import React, { useState, useEffect } from "react";
import { Text, Pressable, View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// 3rd Party Imports
// Local Imports
import { supabase } from "@/src/utils/supabase";
import { Icon } from "@/src/components/Icon";
import { WaitTimePill } from "@/src/components/waitTimePill";
import { tokens, colors, rideScreenStyles } from "@/src/styles";
import { HStack, VStack } from "./ui";

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

	console.log("RideHeader props:", { parkId, id, name, waitTime, singleRiderWaitTime, status });

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

		if (normalizedStatus === "operating" || normalizedStatus === "open") {
			if (waitType === "singleRider") {
				return (
					<HStack style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8, paddingRight: 6, paddingTop: 4, paddingBottom: 6, borderRadius: 6, backgroundColor: colors.card.attraction.status.open.bg, borderWidth: 1, borderColor: colors.card.attraction.status.open.border }}>
						<Icon name="singleRider" fill={colors.card.attraction.status.open.onBg} height={16} width={16} />
						<Text style={{ flex: 1, color: colors.card.attraction.status.open.onBg, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>Single Rider</Text>
						<WaitTimePill waitTime={waitTimeToDisplay || 0} />
					</HStack>
				);
			} else if (waitType === "standby") {

				return (
					<HStack style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8, paddingRight: 6, paddingTop: 4, paddingBottom: 6, borderRadius: 6, backgroundColor: colors.card.attraction.status.open.bg, borderWidth: 1, borderColor: colors.card.attraction.status.open.border }}>
						<Icon name="waitTime" fill={colors.card.attraction.status.open.onBg} height={16} width={16} />
						<Text style={{ flex: 1, color: colors.card.attraction.status.open.onBg, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>Standby Wait</Text>
						<WaitTimePill waitTime={waitTimeToDisplay || 0} />
					</HStack>
				);
			};
		} else if (normalizedStatus === "down") {
			return (
				<HStack style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: colors.card.attraction.status.down.bg, borderWidth: 1, borderColor: colors.card.attraction.status.down.border }}>
					<Icon name="down" fill={colors.card.attraction.status.down.onBg} height={24} width={24} />
					<Text style={{ color: colors.card.attraction.status.down.onBg, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>Down</Text>
				</HStack>
			);
		} else if (normalizedStatus === "closed") {
			return (
				<HStack style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: colors.card.attraction.status.closed.bg, borderWidth: 1, borderColor: colors.card.attraction.status.closed.border }}>
					<Icon name="closed" fill={colors.card.attraction.status.closed.onBg} height={24} width={24} />
					<Text style={{ color: colors.card.attraction.status.closed.onBg, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>Closed</Text>
				</HStack>
			);
		} else if (normalizedStatus === "refurbishment") {
			return (
				<HStack style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: colors.card.attraction.status.refurbishment.bg, borderWidth: 1, borderColor: colors.card.attraction.status.refurbishment.border }}>
					<Icon name="refurbishment" fill={colors.card.attraction.status.refurbishment.onBg} height={24} width={24} />
					<Text style={{ color: colors.card.attraction.status.refurbishment.onBg, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>Refurbishment</Text>
				</HStack>
			);
		}

		return null;
	};

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
					{getStatusView("standby")}
					{singleRiderWaitTime !== undefined && singleRiderWaitTime !== null && (
						getStatusView("singleRider")
					)}
				</HStack>
			</HStack>
		</VStack>
	);
});
