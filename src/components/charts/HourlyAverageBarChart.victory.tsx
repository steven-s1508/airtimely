import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { colors } from "@/src/styles";
import { useFont } from "@shopify/react-native-skia";
import { getAllTimeAverageHourlyWaitTimes } from "@/src/utils/api/getRideStatistics";
import { DateTime } from "luxon";

interface HourlyAverageBarChartVictoryProps {
	rideId: string;
	loading?: boolean;
}

interface HourlyDataPoint {
	hourValue: number;
	standby: number;
	single: number;
	[key: string]: number | string;
}

export const HourlyAverageBarChartVictory: React.FC<HourlyAverageBarChartVictoryProps> = ({ rideId, loading = false }) => {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);
	const [standbyData, setStandbyData] = useState<number[]>([]);
	const [singleData, setSingleData] = useState<number[]>([]);
	const [dataLoading, setDataLoading] = useState(true);

	useEffect(() => {
		const fetchHourlyAverageData = async () => {
			if (!rideId) return;
			setDataLoading(true);
			try {
				const result = await getAllTimeAverageHourlyWaitTimes(rideId);
				setStandbyData(result.averageStandbyWaitTimes || []);
				setSingleData(result.averageSingleRiderWaitTimes || []);
			} catch (error) {
				console.error("Error fetching hourly average data:", error);
				setStandbyData([]);
				setSingleData([]);
			} finally {
				setDataLoading(false);
			}
		};
		fetchHourlyAverageData();
	}, [rideId]);

	const processedData = useMemo<HourlyDataPoint[]>(() => {
		const mappedData = Array.from({ length: 24 }, (_, i) => ({
			hourValue: i,
			standby: standbyData[i] ?? 0,
			single: singleData[i] ?? 0,
		}));
		// Filter out hours where both standby and single rider wait times are 0
		const filteredData = mappedData.filter((d) => !(d.standby === 0 && d.single === 0));
		return filteredData;
	}, [standbyData, singleData]);

	const maxWaitTime = useMemo(() => {
		const values = processedData.flatMap((d) => [d.standby, d.single]);
		return values.length ? Math.max(...values) : 0;
	}, [processedData]);

	const hasSingleData = useMemo(() => {
		return processedData.some((item) => item.single > 0);
	}, [processedData]);

	const isLoading = loading || dataLoading;

	if (isLoading) {
		return (
			<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
				<Text style={chartStyles.chartText}>All-Time Hourly Average Wait Times</Text>
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
				<Text style={chartStyles.chartText}>All-Time Hourly Average Wait Times</Text>
				<View style={{ height: 250 }}>
					<View style={chartStyles.chartContainer}>
						<Text style={chartStyles.chartText}>No average wait time data available</Text>
					</View>
				</View>
			</View>
		);
	}

	return (
		<View style={chartStyles.chartContainer}>
			<Text style={chartStyles.chartText}>All-Time Hourly Average Wait Times</Text>
			<View style={{ height: 250 }}>
				<CartesianChart
					data={processedData}
					xKey="hourValue"
					yKeys={["standby", "single"]}
					xAxis={{
						labelColor: colors.primaryVeryLight,
						font: font,
						/* format to HH:mm */
						formatXLabel: (value) => {
							const date = DateTime.fromObject({ hour: value });
							return date.toFormat("HH:mm");
						},
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
					domainPadding={{ left: 20, right: 20, top: 20 }}
					domain={{
						y: [0, maxWaitTime > 0 ? maxWaitTime * 1.1 : 60],
					}}
				>
					{({ points, chartBounds }) => {
						// Calculate dynamic bar width based on chart width and number of data points
						// We have 2 series (standby and single) so we divide the available space
						const availableWidth = chartBounds.right - chartBounds.left;
						const dataPointCount = processedData.length;
						const seriesCount = 2; // standby and single

						// Calculate bar width with minimum and maximum constraints
						let barWidth = 0;
						if (dataPointCount > 0) {
							// Dynamically adjust gap percentage based on data density
							// Fewer bars = more gaps (up to 70%), more bars = fewer gaps (down to 30%)
							const gapPercentage = Math.max(0.1, Math.min(0.1, 0.1 + dataPointCount / 50));
							const totalBarSpace = availableWidth * (1 - gapPercentage);
							barWidth = totalBarSpace / (dataPointCount * seriesCount);
							// Constrain bar width between 2px minimum and 25px maximum for better responsiveness
							barWidth = Math.max(2, Math.min(25, barWidth));
						}

						return (
							<>
								<Bar points={points.standby} chartBounds={chartBounds} color={colors.primaryVeryLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} barWidth={barWidth} />
								<Bar points={points.single} chartBounds={chartBounds} color={colors.accentLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} barWidth={barWidth} />
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
	);
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
