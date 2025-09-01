import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { colors } from "@/src/styles";
import { useFont } from "@shopify/react-native-skia";
import { getWeekdayAverageWaitTimes } from "@/src/utils/api/getRideStatistics";

interface WeekdayAverageBarChartVictoryProps {
	rideId: string;
	loading?: boolean;
}

interface ChartDataPoint {
	day: string;
	standby: number;
	single: number;
}

export const WeekdayAverageBarChartVictory: React.FC<WeekdayAverageBarChartVictoryProps> = ({ rideId, loading = false }) => {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);
	const [weekdayAverageData, setWeekdayAverageData] = useState<number[]>([]);
	const [weekdayAverageSingleData, setWeekdayAverageSingleData] = useState<number[]>([]);
	const [dataLoading, setDataLoading] = useState(true);

	useEffect(() => {
		const fetchWeekdayAverageData = async () => {
			if (!rideId) return;

			setDataLoading(true);
			try {
				const result = await getWeekdayAverageWaitTimes(rideId);
				// @ts-ignore - TypeScript thinks the return type is different
				const waitTimes = result.averageWaitTimes || result.weeklyAverageWaitTimes || [];
				const singleWaitTimes = result.weeklyAverageSingleWaitTimes || [];
				setWeekdayAverageData(waitTimes);
				setWeekdayAverageSingleData(singleWaitTimes);
			} catch (error) {
				console.error("Error fetching weekday average data:", error);
				setWeekdayAverageData([]);
				setWeekdayAverageSingleData([]);
			} finally {
				setDataLoading(false);
			}
		};

		fetchWeekdayAverageData();
	}, [rideId]);

	const processedData = useMemo(() => {
		const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		return dayLabels.map((day, index) => ({
			day: day,
			standby: weekdayAverageData[index] ?? 0,
			single: weekdayAverageSingleData[index] ?? 0,
		}));
	}, [weekdayAverageData, weekdayAverageSingleData]);

	const maxWaitTime = useMemo(() => {
		const values = processedData.flatMap((d) => [d.standby, d.single]);
		return values.length ? Math.max(...values) : 0;
	}, [processedData]);

	const hasSingleData = useMemo(() => {
		return processedData.some((item) => item.single > 0);
	}, [processedData]);

	const isLoading = loading || dataLoading;

	const contentToRender = useMemo(() => {
		if (isLoading) {
			return (
				<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
					<Text style={chartStyles.chartText}>Average Wait Times by Day</Text>
					<View style={{ height: 250 }}>
						<View style={chartStyles.chartContainerLoading}>
							<Text style={chartStyles.chartText}>Loading chart...</Text>
						</View>
					</View>
				</View>
			);
		}

		if (processedData.every((d) => d.standby === 0 && d.single === 0)) {
			return (
				<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
					<Text style={chartStyles.chartText}>Average Wait Times by Day</Text>
					<View style={{ height: 250 }}>
						<View style={chartStyles.chartContainer}>
							<Text style={chartStyles.chartText}>No average wait time data available</Text>
						</View>
					</View>
				</View>
			);
		}

		return (
			<>
				<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
					<Text style={chartStyles.chartText}>Average Wait Times by Day of Week</Text>
					<View style={{ height: 250 }}>
						<CartesianChart
							data={processedData}
							xKey="day"
							yKeys={["standby", "single"]}
							xAxis={{
								tickCount: 7,
								labelColor: colors.primaryVeryLight,
								font: font,
								formatXLabel: (value) => value,
							}}
							yAxis={[
								{
									yKeys: ["standby", "single"],
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
							{({ points, chartBounds }) => {
								return (
									<>
										<Bar points={points.standby} chartBounds={chartBounds} color={colors.primaryVeryLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} />
										{hasSingleData && <Bar points={points.single} chartBounds={chartBounds} color={colors.accentLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} />}
									</>
								);
							}}
						</CartesianChart>
						<View style={styles.legendContainer}>
							<View style={styles.legendItem}>
								<View style={[styles.legendColor, { backgroundColor: colors.primaryVeryLight }]} />
								<Text style={styles.legendText}>Standby Wait</Text>
							</View>
							{hasSingleData && (
								<View style={styles.legendItem}>
									<View style={[styles.legendColor, { backgroundColor: colors.accentLight }]} />
									<Text style={styles.legendText}>Single Rider</Text>
								</View>
							)}
						</View>
					</View>
				</View>
			</>
		);
	}, [isLoading, processedData, maxWaitTime, hasSingleData]);

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
