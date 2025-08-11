import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Bar, useChartPressState } from "victory-native";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { colors } from "@/src/styles";
import { useFont, Group, Rect, Text as SkiaText } from "@shopify/react-native-skia";
import { getAllTimeAverageHourlyWaitTimes } from "@/src/utils/api/getRideStatistics";
import type { SharedValue } from "react-native-reanimated";
import { DateTime } from "luxon";

interface HourlyAverageBarChartVictoryProps {
	rideId: string;
	loading?: boolean;
}

interface HourlyDataPoint {
	hourValue: number;
	standby: number;
	single: number;
}

export const HourlyAverageBarChartVictory: React.FC<HourlyAverageBarChartVictoryProps> = ({ rideId, loading = false }) => {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);
	const [standbyData, setStandbyData] = useState<number[]>([]);
	const [singleData, setSingleData] = useState<number[]>([]);
	const [dataLoading, setDataLoading] = useState(true);
	const { state, isActive } = useChartPressState({ x: 0, y: { value: 0 } });

	useEffect(() => {
		const fetchHourlyAverageData = async () => {
			if (!rideId) return;
			setDataLoading(true);
			try {
				const result = await getAllTimeAverageHourlyWaitTimes(rideId);
				setStandbyData(result.averageStandbyWaitTimes || []);
				console.log("Fetched standby wait times:", result.averageStandbyWaitTimes);
				setSingleData(result.averageSingleRiderWaitTimes || []);
				console.log("Fetched single rider wait times:", result.averageSingleRiderWaitTimes);
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

	console.log("Processed hourly average data:", processedData);

	const maxWaitTime = useMemo(() => {
		const values = processedData.flatMap((d) => [d.standby, d.single]);
		return values.length ? Math.max(...values) : 0;
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
				<CartesianChart<HourlyDataPoint>
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
					domainPadding={{ left: 10, right: 10, top: 20 }}
					domain={{
						y: [0, maxWaitTime > 0 ? maxWaitTime * 1.1 : 60],
					}}
					/* chartPressState={state as any} */
				>
					{({ points, chartBounds }) => (
						<>
							<Bar points={points.standby} chartBounds={chartBounds} color={colors.primaryVeryLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} />
							<Bar points={points.single} chartBounds={chartBounds} color={colors.accentLight} animate={{ type: "spring", duration: 300 }} roundedCorners={{ topLeft: 4, topRight: 4 }} />
							{isActive && <ToolTip x={state.x.position} y={state.y.value.position} hour={processedData[state.x.value.index].hourValue} standby={processedData[state.x.value.index].standby} single={processedData[state.x.value.index].single} />}
						</>
					)}
				</CartesianChart>
			</View>
		</View>
	);
};

/* function ToolTip({ x, y, hour, standby, single }: { x: SharedValue<number>; y: SharedValue<number>; hour: number; standby: number; single: number }) {
	const font = useFont(require("@/src/assets/fonts/noto_sans.ttf"), 12);
	if (!font) return null;
	const tooltipWidth = 100;
	const tooltipHeight = 60;
	const padding = 8;

	return (
		<Group>
			<Rect x={x.value - tooltipWidth / 2} y={y.value - tooltipHeight - 10} width={tooltipWidth} height={tooltipHeight} color="rgba(0,0,0,0.8)" r={4} />
			<SkiaText x={x.value} y={y.value - tooltipHeight + padding + 12} text={`${hour}h`} font={font} size={12} color="white" textAlign="center" />
			<SkiaText x={x.value} y={y.value - tooltipHeight + padding + 28} text={`Standby: ${standby}m`} font={font} size={12} color="white" textAlign="center" />
			<SkiaText x={x.value} y={y.value - tooltipHeight + padding + 44} text={`Single: ${single}m`} font={font} size={12} color="white" textAlign="center" />
		</Group>
	);
} */

const styles = StyleSheet.create({});
