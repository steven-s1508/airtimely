// React / React Native Imports
import React, { use, useEffect, useState, useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
// Expo Imports
import { useLocalSearchParams } from "expo-router";
// 3rd Party Imports
import { Text, HStack, VStack } from "@/src/components/ui";
// Local Imports
import { colors, styles, rideScreenStyles } from "@/src/styles";
import { Icon } from "@/src/components/Icon";
import { RideHeader } from "@/src/components/rideHeader";
import { getLiveRideStatisticsWithTimezone } from "@/src/utils/api/getRideStatistics";
import { WaitTimeLineChartVictory } from "@/src/components/charts/WaitTimeLineChart.victory";
import { WeekdayAverageBarChartVictory } from "@/src/components/charts/WeekdayAverageBarChart.victory";
import { HourlyAverageBarChartVictory } from "@/src/components/charts/HourlyAverageBarChart.victory";

export default function RideScreen() {
	console.log("RideScreen rendered");
	const params = useLocalSearchParams<{ parkId: string; rideId: string; name: string; status: string }>();
	const [liveWaitTimes, setLiveWaitTimes] = useState<{ status: string | null; wait_time_minutes: number | null; single_rider_wait_time_minutes: number | null; recorded_at_local: string | null }[]>([]);
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(true);

	const handleRefresh = async () => {
		setRefreshing(true);
		setLoading(true);
		try {
			if (params.rideId) {
				console.log("Fetching live ride statistics for ride ID:", params.rideId);
				const { waitTimeData, waitTimeError } = await getLiveRideStatisticsWithTimezone(params.rideId as string);
				if (waitTimeError) {
					console.error("Error fetching ride statistics:", waitTimeError);
				} else {
					setLiveWaitTimes(waitTimeData || []);
				}
			}
		} catch (error) {
			console.error("Error refreshing wait times:", error);
		} finally {
			setRefreshing(false);
			setLoading(false);
		}
	};

	useEffect(() => {
		handleRefresh();
	}, [params.rideId]);

	/* const waitTimeStyles = useMemo(() => {
		const displayWaitTime = liveWaitTimes[0]?.wait_time_minutes ?? 0;

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
	}, [liveWaitTimes]);

	const singleRiderWaitTimeStyles = useMemo(() => {
		const displaySingleRiderWaitTime = liveWaitTimes[0]?.single_rider_wait_time_minutes ?? 0;

		if (displaySingleRiderWaitTime < 45) {
			return {
				statusBackgroundColor: colors.primaryVeryDark,
				statusBorderColor: colors.primaryLight,
				waitTimeTextColor: colors.primaryLight,
			};
		} else if (displaySingleRiderWaitTime < 60) {
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
	}, [liveWaitTimes]);

	const styling = useMemo(() => {
		const normalizedStatus = status?.toLowerCase();

		switch (normalizedStatus) {
			case "operating":
				return {
					containerColor: colors.primaryVeryDark,
					containerBorderColor: colors.primary,
					rideNameColor: colors.primaryWhite,
					statusContainerColor: colors.primaryDark,
					leftIconColor: colors.primaryLight,
					statusTextColor: colors.primaryVeryLight,
					statusBackgroundColor: waitTimeStyles.statusBackgroundColor,
					statusBorderColor: waitTimeStyles.statusBorderColor,
					waitTimeTextColor: waitTimeStyles.waitTimeTextColor,
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
	}, [params.status]);

	const displayWaitTime = liveWaitTimes[0]?.wait_time_minutes ?? 0;
	const displaySingleRiderWaitTime = liveWaitTimes[0]?.single_rider_wait_time_minutes ?? 0;

	const statusView = (waitType = "standby") =>
		useMemo(() => {
			const normalizedStatus = status?.toLowerCase();

			// Determine the wait time to display based on wait type
			let waitTimeToDisplay;
			if (waitType === "standby") {
				waitTimeToDisplay = displayWaitTime;
			} else if (waitType === "singleRider") {
				waitTimeToDisplay = displaySingleRiderWaitTime ?? 0;
			}

			if (normalizedStatus === "operating" || normalizedStatus === "open") {
				return (
					<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: waitType === "singleRider" ? singleRiderWaitTimeStyles.statusBackgroundColor : styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: waitType === "singleRider" ? singleRiderWaitTimeStyles.statusBorderColor : styling.statusBorderColor }}>
						<Text style={{ color: waitType === "singleRider" ? singleRiderWaitTimeStyles.waitTimeTextColor : styling.waitTimeTextColor, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTimeToDisplay}</Text>
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
		}, [params.status, displayWaitTime, styling, waitTimeStyles, displaySingleRiderWaitTime, waitType]); */

	return (
		<ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating wait times..." titleColor={colors.primaryLight} />}>
			<View style={rideScreenStyles.rideScreenContainer}>
				<RideHeader parkId={params.parkId as string} item={{ id: params.rideId as string, name: params.name as string }} waitTime={liveWaitTimes[liveWaitTimes.length - 1]?.wait_time_minutes} singleRiderWaitTime={liveWaitTimes[liveWaitTimes.length - 1]?.single_rider_wait_time_minutes} status={liveWaitTimes[liveWaitTimes.length - 1]?.status || params.status} onRefresh={handleRefresh} isRefreshing={refreshing} />

				<View style={{ flex: 1, flexDirection: "column", padding: 16 }}>
					{/* <HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
						<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
							<Icon name="waitTime" fill={styling.leftIconColor} height={24} width={24} />
							<Text style={{ color: styling.statusTextColor, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>{styling.statusText}</Text>
							{statusView("standby")}
						</HStack>
						{displaySingleRiderWaitTime !== undefined && (
							<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
								<Icon name="singleRider" fill={colors.primaryLight} height={24} width={24} />
								<Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Single Rider</Text>
								{statusView("singleRider")}
							</HStack>
						)}
					</HStack> */}
					<WaitTimeLineChartVictory data={liveWaitTimes} loading={loading} parkId={params.parkId as string} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<HourlyAverageBarChartVictory loading={loading} rideId={params.rideId as string} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<WeekdayAverageBarChartVictory loading={loading} rideId={params.rideId as string} />
				</View>
			</View>
		</ScrollView>
	);
}
