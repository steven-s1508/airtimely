import React, { useState, useEffect } from "react";
import { LineChart } from "react-native-chart-kit";
import { Box } from "@/src/components/ui/box";
import { Text } from "@/src/components/ui/text";
import { chartStyles } from "@/src/styles/chartStyles";
import { formatTime } from "@/src/utils/formatTime";
import { colors } from "@/src/styles/styles";
import { Dimensions } from "react-native";
import getParkOperatingHours from "@/src/utils/helpers/getParkOperatingHours";
import { normalizeWaitTimeRecord } from "@/src/utils/helpers/normalizeWaitTimeRecord";

interface WaitTimeData {
	status: string;
	wait_time_minutes: number | null;
	single_rider_wait_time_minutes: number | null;
	recorded_at_local: string;
}

interface WaitTimeLineChartProps {
	data: WaitTimeData[];
	loading?: boolean;
	parkId?: string; // Assuming parkId is available or passed down
}

const screenWidth = Dimensions.get("window").width;

// Helper function to generate y-axis labels
const getYAxisLabels = (maxValue: number, desiredTickCount: number = 5): string[] => {
	if (maxValue <= 0) {
		return ["0"];
	}

	let stepSize: number;
	let roundedMax: number;

	// Determine a "nice" step size
	if (maxValue <= desiredTickCount) {
		stepSize = 1;
		roundedMax = Math.ceil(maxValue / stepSize) * stepSize;
	} else {
		// Calculate an initial step size
		let roughStep = maxValue / (desiredTickCount - 1);
		let exponent = Math.floor(Math.log10(roughStep));
		let fraction = roughStep / Math.pow(10, exponent);

		// Round the fraction to a "nice" number (1, 2, 5, 10)
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

	const labels: string[] = [];
	const numberOfSteps = Math.round(roundedMax / stepSize);

	for (let i = 0; i <= numberOfSteps; i++) {
		labels.push(i.toString());
	}

	return labels;
};

export const WaitTimeLineChart: React.FC<WaitTimeLineChartProps> = ({ data, loading = false, parkId }) => {
	/* console.log(
		"data items: ",
		data.map((item) => ({
			recorded_at_local: item.recorded_at_local,
		}))
	); */

	// Transform data for the chart - keep all data points
	const chartData = {
		// round to nearest 5 minutes for better readability
		labels: data.map((item) => (item.recorded_at_local ? normalizeWaitTimeRecord({ recorded_at_local: item.recorded_at_local })?.recorded_at_local || "N/A" : "N/A")),
		datasets: [
			{
				data: data.map((item) => (item.wait_time_minutes !== null ? item.wait_time_minutes : 0)),
				color: (opacity = 1) => `rgba(134, 239, 172, ${opacity})`, // green-400
				strokeWidth: 2,
				label: "Wait Time",
			},
			...(data.some((item) => item.single_rider_wait_time_minutes !== null)
				? [
						{
							data: data.map((item) => (item.single_rider_wait_time_minutes !== null ? item.single_rider_wait_time_minutes : 0)),
							color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`, // amber-400
							strokeWidth: 2,
							label: "Single Rider Wait Time",
						},
				  ]
				: []),
		],
	};

	// Calculate max wait time for y-axis (potential future use if y-axis customization is available)
	const maxWaitTime = Math.max(...data.map((item) => item.wait_time_minutes ?? 0), ...data.map((item) => item.single_rider_wait_time_minutes ?? 0));
	// const yAxisLabels = getYAxisLabels(maxWaitTime > 0 ? maxWaitTime : 60); // Default to 60 if no data or all zeros

	// Function to format x-axis labels - only show full hours
	const formatXLabel = (xValue: string): string => {
		if (xValue === "N/A" || !xValue) return "";
		// Check if the label is a full hour (ends with :00)
		if (xValue.split(":")[1] === "00") {
			// If it's a full hour, return just the hour part
			const hour = xValue.split(":")[0];
			return hour;
		}
		return ""; // Return empty string for non-full hours
	};

	if (loading) {
		return (
			<Box style={chartStyles.chartContainer}>
				<Text style={chartStyles.chartText}>Loading chart...</Text>
			</Box>
		);
	}

	if (!data || data.length === 0) {
		return (
			<Box style={chartStyles.chartContainer}>
				<Text style={chartStyles.chartText}>No wait time data available</Text>
			</Box>
		);
	}

	return (
		<Box style={[chartStyles.chartContainer, { padding: 16 }]}>
			<Text style={chartStyles.chartText}>Today's Wait Times</Text>
			<LineChart
				data={chartData}
				width={screenWidth - 16} // Adjust width for padding
				height={200}
				withHorizontalLines={true}
				withVerticalLines={false}
				withDots={false}
				fromZero={true}
				yAxisInterval={1} // Original interval, let library calculate labels
				chartConfig={{
					backgroundColor: colors.primaryBlack,
					backgroundGradientFrom: colors.primaryBlack,
					backgroundGradientTo: colors.primaryBlack,
					decimalPlaces: 0,
					color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
					labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
					propsForDots: {
						r: "2",
						strokeWidth: "3",
						stroke: colors.primaryLight,
					},
				}}
				bezier
				style={{
					marginVertical: 8,
					marginLeft: 26,
					borderRadius: 16,
					paddingRight: 42,
				}}
				formatXLabel={formatXLabel}
			/>
		</Box>
	);
};
