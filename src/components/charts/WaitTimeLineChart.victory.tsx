import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { normalizeWaitTimeRecord } from "@/src/utils/helpers/normalizeWaitTimeRecord";
import { colors } from "@/src/styles";
import { DateTime } from "luxon";
import { useFont } from "@shopify/react-native-skia";

interface WaitTimeData {
	status: string;
	wait_time_minutes: number | null;
	single_rider_wait_time_minutes: number | null;
	recorded_at_local: string;
}

interface WaitTimeLineChartVictoryProps {
	data: WaitTimeData[];
	loading?: boolean;
	parkId?: string;
}

// Helper function to generate y-axis labels (tick values)
const getYAxisTickValues = (maxValue: number, desiredTickCount: number = 5): number[] => {
	if (maxValue <= 0) {
		return [0];
	}

	let stepSize: number;
	let roundedMax: number;

	if (maxValue <= desiredTickCount) {
		stepSize = 1;
		roundedMax = Math.ceil(maxValue / stepSize) * stepSize;
	} else {
		let roughStep = maxValue / (desiredTickCount - 1);
		let exponent = Math.floor(Math.log10(roughStep));
		let fraction = roughStep / Math.pow(10, exponent);

		if (fraction < 1.5) {
			fraction = 1;
		} else if (fraction < 3) {
			fraction = 2;
		} else if (fraction < 7) {
			fraction = 5;
		} else {
			fraction = 10;
		}
		stepSize = fraction * Math.pow(10, exponent);
		roundedMax = Math.ceil(maxValue / stepSize) * stepSize;
	}

	const labels: number[] = [];
	const numberOfSteps = Math.round(roundedMax / stepSize);

	for (let i = 0; i <= numberOfSteps; i++) {
		labels.push(i * stepSize);
	}
	return labels;
};

export const WaitTimeLineChartVictory: React.FC<WaitTimeLineChartVictoryProps> = ({ data, loading = false, parkId }) => {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);

	const processedData = useMemo(() => {
		return data.map((item) => {
			const normalizedTime = item.recorded_at_local ? DateTime.fromISO(item.recorded_at_local) : null;
			const timeInMs = normalizedTime?.toMillis() || 0;
			// if the first data point is at
			return {
				time: timeInMs,
				waitTime: item.wait_time_minutes !== null ? item.wait_time_minutes : 0,
				singleRiderWaitTime: item.single_rider_wait_time_minutes !== null ? item.single_rider_wait_time_minutes : 0,
			};
		});
	}, [data]);

	const maxWaitTime = useMemo(() => {
		if (processedData.length === 0) return 0; // Avoid issues with empty data for Math.max
		return Math.max(...processedData.map((item) => item.waitTime), ...processedData.map((item) => item.singleRiderWaitTime));
	}, [processedData]);

	const yAxisTickValues = useMemo(() => {
		return getYAxisTickValues(maxWaitTime > 0 ? maxWaitTime : 60);
	}, [maxWaitTime]);

	const hasSingleRiderData = useMemo(() => {
		return processedData.some((item) => item.singleRiderWaitTime > 0);
	}, [processedData]);

	// Generate x-axis tick values (hours) as numbers
	const xTickValues = useMemo(() => {
		const seen = new Set<number>();
		const ticks: number[] = [];
		for (const item of processedData) {
			const hour = DateTime.fromMillis(item.time).hour;
			if (!seen.has(hour)) {
				seen.add(hour);
				// Put a representative ms value for that hour (e.g., top-of-hour)
				const topOfHour = DateTime.fromMillis(item.time).set({ minute: 0, second: 0, millisecond: 0 }).toMillis();
				ticks.push(topOfHour);
			}
		}
		return ticks;
	}, [processedData]);

	// Determine what to render based on loading and data state
	const contentToRender = useMemo(() => {
		if (loading) {
			return (
				<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
					<Text style={chartStyles.chartText}>Today's Wait Times</Text>
					<View style={{ height: 150 }}>
						<View style={chartStyles.chartContainerLoading}>
							<Text style={chartStyles.chartText}>Loading...</Text>
						</View>
					</View>
				</View>
			);
		}

		if (!data || data.length === 0) {
			return (
				<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
					<Text style={chartStyles.chartText}>Today's Wait Times</Text>
					<View style={{ height: 150 }}>
						<View style={chartStyles.chartContainer}>
							<Text style={[chartStyles.chartText, { fontStyle: "italic", fontWeight: 400 }]}>No live wait time data available</Text>
						</View>
					</View>
				</View>
			);
		}

		return (
			<>
				<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
					<Text style={chartStyles.chartText}>Today's Wait Times</Text>
					<View style={{ height: 150 }}>
						<CartesianChart
							data={processedData}
							xKey="time"
							yKeys={["waitTime", "singleRiderWaitTime"]}
							xAxis={{
								tickValues: xTickValues,
								formatXLabel: (v: number) => DateTime.fromMillis(v).toFormat("H:mm"),
								labelColor: colors.primaryVeryLight,
								lineColor: colors.primary,
								font: font,
							}}
							yAxis={[
								{
									tickValues: yAxisTickValues,
									formatYLabel: (value: number) => `${value}m`,
									labelColor: colors.primaryVeryLight,
									lineColor: colors.primary,
									font: font,
								},
							]}
							domain={{
								x: [Math.min(...processedData.map((d) => d.time)), Math.max(...processedData.map((d) => d.time))],
								y: [0, maxWaitTime > 0 ? maxWaitTime : 60],
							}}
						>
							{({ points }) => {
								return (
									<>
										<Line points={points.waitTime} color={colors.primaryVeryLight} strokeWidth={2} animate={{ type: "timing", duration: 300 }} />
										{hasSingleRiderData && points.singleRiderWaitTime?.length > 0 && <Line points={points.singleRiderWaitTime} color={colors.accentLight} strokeWidth={2} animate={{ type: "timing", duration: 300 }} />}
									</>
								);
							}}
						</CartesianChart>
					</View>
					<View style={styles.legendContainer}>
						<View style={styles.legendItem}>
							<View style={[styles.legendColor, { backgroundColor: colors.primaryVeryLight }]} />
							<Text style={styles.legendText}>Standby Wait</Text>
						</View>
						{hasSingleRiderData && (
							<View style={styles.legendItem}>
								<View style={[styles.legendColor, { backgroundColor: colors.accentLight }]} />
								<Text style={styles.legendText}>Single Rider</Text>
							</View>
						)}
					</View>
				</View>
			</>
		);
	}, [loading, data, processedData, yAxisTickValues, hasSingleRiderData, xTickValues]); // font is a dependency, though it's stable

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
