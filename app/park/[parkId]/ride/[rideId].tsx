// React / React Native Imports
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
// Expo Imports
import { useLocalSearchParams } from "expo-router";
// 3rd Party Imports
import { Text } from "@/src/components/ui";
import { useQueryClient } from "@tanstack/react-query";
// Local Imports
import { colors, rideScreenStyles } from "@/src/styles";
import { RideHeader } from "@/src/components/rideHeader";
import { WaitTimeLineChartVictory } from "@/src/components/charts/WaitTimeLineChart.victory";
import { WeekdayAverageBarChartVictory } from "@/src/components/charts/WeekdayAverageBarChart.victory";
import { HourlyAverageBarChartVictory } from "@/src/components/charts/HourlyAverageBarChart.victory";
import { MonthlyAverageBarChartVictory } from "@/src/components/charts/MonthlyAverageBarChart.victory";
import { isValidUUID } from "@/src/utils/helpers/validation";
import { useLiveRideStatistics } from "@/src/hooks/api/useRideStatistics";
import { queryKeys } from "@/src/utils/queryKeys";

interface LiveWaitTimeChartData {
	status: string;
	wait_time_minutes: number | null;
	single_rider_wait_time_minutes: number | null;
	recorded_at_local: string;
}

export default function RideScreen() {
	const params = useLocalSearchParams<{ parkId: string; rideId: string; name: string; status: string }>();
	const queryClient = useQueryClient();
	const [isManualRefreshing, setIsManualRefreshing] = useState(false);

	// Validate ride ID and park ID are valid UUIDs
	if (!params.rideId || !isValidUUID(params.rideId) || !params.parkId || !isValidUUID(params.parkId)) {
		console.error(`Invalid ride ID: ${params.rideId} or park ID: ${params.parkId}`);
		return <View />;
	}

	const rideId = params.rideId as string;
	const parkId = params.parkId as string;
	const { data: liveRideStatistics, isLoading, isRefetching } = useLiveRideStatistics(rideId, parkId);
	const liveWaitTimes = useMemo<LiveWaitTimeChartData[]>(() => {
		return (liveRideStatistics?.waitTimeData || []).map((waitTime) => ({
			status: waitTime.status || "Unknown",
			wait_time_minutes: waitTime.wait_time_minutes,
			single_rider_wait_time_minutes: waitTime.single_rider_wait_time_minutes,
			recorded_at_local: waitTime.recorded_at_local || waitTime.recorded_at_timestamp,
		}));
	}, [liveRideStatistics?.waitTimeData]);
	const latestWaitTime = liveWaitTimes[liveWaitTimes.length - 1];
	const refreshing = isManualRefreshing || isRefetching;

	const handleRefresh = async () => {
		setIsManualRefreshing(true);
		try {
			await queryClient.invalidateQueries({ queryKey: queryKeys.rideStatistics(rideId) });
		} finally {
			setIsManualRefreshing(false);
		}
	};

	return (
		<ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating wait times..." titleColor={colors.primaryLight} />}>
			<View style={rideScreenStyles.rideScreenContainer}>
				<RideHeader parkId={parkId} item={{ id: rideId, name: params.name as string }} waitTime={latestWaitTime?.wait_time_minutes} singleRiderWaitTime={latestWaitTime?.single_rider_wait_time_minutes} status={latestWaitTime?.status || params.status} onRefresh={handleRefresh} isRefreshing={refreshing} />

				<View style={{ flex: 1, flexDirection: "column", padding: 16 }}>
					<WaitTimeLineChartVictory data={liveWaitTimes} loading={isLoading} parkId={parkId} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<HourlyAverageBarChartVictory loading={isLoading} rideId={rideId} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<MonthlyAverageBarChartVictory loading={isLoading} rideId={rideId} />
					<View style={{ height: 2, backgroundColor: colors.primaryDark, marginVertical: 16 }} />
					<WeekdayAverageBarChartVictory loading={isLoading} rideId={rideId} />
				</View>
			</View>
		</ScrollView>
	);
}
