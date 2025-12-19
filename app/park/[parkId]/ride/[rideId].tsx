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
import { MonthlyAverageBarChartVictory } from "@/src/components/charts/MonthlyAverageBarChart.victory";
import { isValidUUID } from "@/src/utils/helpers/validation";

export default function RideScreen() {
	const params = useLocalSearchParams<{ parkId: string; rideId: string; name: string; status: string }>();
	const [liveWaitTimes, setLiveWaitTimes] = useState<{ status: string | null; wait_time_minutes: number | null; single_rider_wait_time_minutes: number | null; recorded_at_local: string | null }[]>([]);
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(true);

	// Validate ride ID and park ID are valid UUIDs
	if (!params.rideId || !isValidUUID(params.rideId) || !params.parkId || !isValidUUID(params.parkId)) {
		console.error(`Invalid ride ID: ${params.rideId} or park ID: ${params.parkId}`);
		return <View />;
	}

	const handleRefresh = async () => {
		setRefreshing(true);
		setLoading(true);
		try {
			if (params.rideId) {
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

	return (
		<ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating wait times..." titleColor={colors.primaryLight} />}>
			<View style={rideScreenStyles.rideScreenContainer}>
				<RideHeader parkId={params.parkId as string} item={{ id: params.rideId as string, name: params.name as string }} waitTime={liveWaitTimes[liveWaitTimes.length - 1]?.wait_time_minutes} singleRiderWaitTime={liveWaitTimes[liveWaitTimes.length - 1]?.single_rider_wait_time_minutes} status={liveWaitTimes[liveWaitTimes.length - 1]?.status || params.status} onRefresh={handleRefresh} isRefreshing={refreshing} />

				<View style={{ flex: 1, flexDirection: "column", padding: 16 }}>
					<WaitTimeLineChartVictory data={liveWaitTimes} loading={loading} parkId={params.parkId as string} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<HourlyAverageBarChartVictory loading={loading} rideId={params.rideId as string} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<MonthlyAverageBarChartVictory loading={loading} rideId={params.rideId as string} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<WeekdayAverageBarChartVictory loading={loading} rideId={params.rideId as string} />
				</View>
			</View>
		</ScrollView>
	);
}
