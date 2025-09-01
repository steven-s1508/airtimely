import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { colors } from "@/src/styles";
import { useFont } from "@shopify/react-native-skia";
import { getMonthlyAverageWaitTimes } from "@/src/utils/api/getRideStatistics";
import { DateTime } from "luxon";

interface MonthlyAverageBarChartVictoryProps {
	rideId: string;
	loading?: boolean;
}

interface ChartDataPoint {
	dayValue: number;
	standby: number;
	single: number;
}

export const MonthlyAverageBarChartVictory: React.FC<MonthlyAverageBarChartVictoryProps> = ({ rideId, loading = false }) => {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);
	const [monthlyAverageData, setMonthlyAverageData] = useState<number[]>([]);
	const [monthlyAverageSingleData, setMonthlyAverageSingleData] = useState<number[]>([]);
	const [dataLoading, setDataLoading] = useState(true);

	useEffect(() => {
		const fetchMonthlyAverageData = async () => {
			if (!rideId) return;

			setDataLoading(true);
			try {
				const result = await getMonthlyAverageWaitTimes(rideId);
				setMonthlyAverageData(result.monthlyAverageWaitTimes);
				setMonthlyAverageSingleData(result.monthlyAverageSingleWaitTimes);
			} catch (error) {
				console.error("Error fetching monthly average data:", error);
				setMonthlyAverageData([]);
				setMonthlyAverageSingleData([]);
			} finally {
				setDataLoading(false);
			}
		};

		fetchMonthlyAverageData();
	}, [rideId]);

	const processedData = useMemo(() => {
		const daysInMonth = DateTime.now().daysInMonth;
		return Array.from({ length: daysInMonth }, (_, i) => ({
			dayValue: i + 1,
			standby: monthlyAverageData[i] ?? 0,
			single: monthlyAverageSingleData[i] ?? 0,
		}));
	}, [monthlyAverageData, monthlyAverageSingleData]);

	const maxWaitTime = useMemo(() => {
		const values = processedData.flatMap((d) => [d.standby, d.single]);
		return values.length ? Math.max(...values) : 0;
	}, [processedData]);

	const hasSingleData = useMemo(() => {
		return processedData.some((item) => item.single > 0);
	}, [processedData]);

	const isLoading = loading || dataLoading;

	const barWidth = 8; // Increased bar width
	const seriesCount = 2; // standby and single
	const chartPadding = 20;
	const daysInMonth = DateTime.now().daysInMonth;
	const chartWidth = daysInMonth * barWidth * seriesCount + chartPadding * 2;

	const tickValues = useMemo(() => {
		const values: number[] = [];
		for (let i = 1; i <= daysInMonth; i += 1) {
			values.push(i);
		}
		console.log("tickvalues: ", values);
		return values;
	}, [daysInMonth]);

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

	if (isLoading) {
		return (
			<View style={[chartStyles.chartContainer, { flex: 0, padding: 0 }]}>
				<Text style={chartStyles.chartText}>Average Wait Times by Day of Month</Text>
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
				<Text style={chartStyles.chartText}>Average Wait Times by Day of Month</Text>
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
			<Text style={chartStyles.chartText}>Average Wait Times by Day of Month</Text>
			<ScrollView horizontal={true}>
				<View style={{ width: chartWidth, height: 250 }}>
					<CartesianChart
						data={processedData}
						xKey="dayValue"
						yKeys={["standby", "single"]}
						xAxis={{
							labelColor: colors.primaryVeryLight,
							font: font,
							formatXLabel: (value) => DateTime.fromObject({ day: value }).toFormat("ccc, dd"),
							tickValues: tickValues,
							tickCount: tickValues.length,
							labelRotate: 75,
							labelOffset: 2,
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
							x: [1, daysInMonth],
							y: [0, maxWaitTime > 0 ? maxWaitTime * 1.1 : 60],
						}}
					>
						{({ points, chartBounds }) => {
							return (
								<>
									<Bar points={points.standby} chartBounds={chartBounds} color={colors.primaryVeryLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} barWidth={barWidth} />
									{hasSingleData && <Bar points={points.single} chartBounds={chartBounds} color={colors.accentLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} barWidth={barWidth} />}
								</>
							);
						}}
					</CartesianChart>
				</View>
			</ScrollView>
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
	);
};
