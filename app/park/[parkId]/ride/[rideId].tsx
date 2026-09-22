// React / React Native Imports
import React, { useState } from "react";
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
	const { data: liveRideStatistics, isLoading, isRefetching } = useLiveRideStatistics(rideId);
	const ride = liveRideStatistics?.ride;
	const liveWaitTimes = liveRideStatistics?.waitTimeData ?? [];
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
				<RideHeader parkName={ride?.parkName} item={{ id: rideId, name: ride?.name ?? (params.name as string) }} waitTime={ride?.live?.waitMinutes} singleRiderWaitTime={ride?.live?.singleRiderMinutes} status={ride?.live?.status || params.status} onRefresh={handleRefresh} isRefreshing={refreshing} />

				<View style={{ flex: 1, flexDirection: "column", padding: 16 }}>
					<WaitTimeLineChartVictory data={liveWaitTimes} loading={isLoading} timezone={ride?.timezone} />
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
