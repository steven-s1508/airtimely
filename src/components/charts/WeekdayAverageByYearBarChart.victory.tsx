import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { colors } from "@/src/styles";
import { useFont } from "@shopify/react-native-skia";
import { getWeekdayAverageWaitTimesByYear } from "@/src/utils/api/getRideStatistics";

interface WeekdayAverageByYearBarChartVictoryProps {
	rideId: string;
	year: number;
	loading?: boolean;
}

export const WeekdayAverageByYearBarChartVictory: React.FC<WeekdayAverageByYearBarChartVictoryProps> = ({ rideId, year, loading = false }) => {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);
	const [weekdayAverageData, setWeekdayAverageData] = useState<number[]>([]);
	const [dataLoading, setDataLoading] = useState(true);

	useEffect(() => {
		const fetchWeekdayAverageData = async () => {
			if (!rideId) return;

			setDataLoading(true);
			try {
				const result = await getWeekdayAverageWaitTimesByYear(rideId, year);
				// @ts-ignore - TypeScript thinks the return type is different
				const waitTimes = result.averageWaitTimes || result.weeklyAverageWaitTimes || [];
				setWeekdayAverageData(waitTimes);
			} catch (error) {
				console.error("Error fetching weekday average data:", error);
				setWeekdayAverageData([]);
			} finally {
				setDataLoading(false);
			}
		};

		fetchWeekdayAverageData();
	}, [rideId]);

	const processedData = useMemo(() => {
		const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		return weekdayAverageData.map((value, index) => ({
			day: dayLabels[index],
			value: value,
		}));
	}, [weekdayAverageData]);

	const maxWaitTime = useMemo(() => {
		if (processedData.length === 0) return 0;
		return Math.max(...processedData.map((item) => item.value));
	}, [processedData]);

	const isLoading = loading || dataLoading;

	const contentToRender = useMemo(() => {
		if (isLoading) {
			return (
				<View style={chartStyles.chartContainer}>
					<Text style={chartStyles.chartText}>Loading chart...</Text>
				</View>
			);
		}

		if (!weekdayAverageData || weekdayAverageData.length === 0) {
			return (
				<View style={chartStyles.chartContainer}>
					<Text style={chartStyles.chartText}>No average wait time data available</Text>
				</View>
			);
		}

		return (
			<>
				<View style={chartStyles.chartContainer}>
					<Text style={chartStyles.chartText}>Average Wait Times by Day</Text>
					<View style={{ height: 250 }}>
						<CartesianChart
							data={processedData}
							xKey="day"
							yKeys={["value"]}
							xAxis={{
								tickCount: 7,
								labelColor: colors.primaryVeryLight,
								font: font,
								formatXLabel: (value) => value,
							}}
							yAxis={[
								{
									yKeys: ["value"],
									labelColor: colors.primaryVeryLight,
									lineColor: colors.primary,
									font: font,
									formatYLabel: (value) => `${value}m`,
								},
							]}
							domainPadding={{ left: 30, right: 30, top: 20 }}
							domain={{
								y: [0, maxWaitTime > 0 ? maxWaitTime * 1.1 : 60],
							}}
						>
							{({ points, chartBounds }) => (
								<>
									<Bar points={points.value} chartBounds={chartBounds} color={colors.primaryVeryLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} />
									{isActive && <ToolTip x={state.x.position} y={state.y.value.position} value={state.y.value.value.value} day={state.x.value.value} />}
								</>
							)}
						</CartesianChart>
					</View>
				</View>
			</>
		);
	}, [isLoading, weekdayAverageData, processedData, maxWaitTime, isActive, state]);

	return contentToRender;
};

const styles = StyleSheet.create({
	legendContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: 8,
		gap: 16,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	legendColor: {
		width: 12,
		height: 3,
		borderRadius: 2,
	},
	legendText: {
		color: colors.primaryVeryLight,
		fontSize: 10,
	},
});
