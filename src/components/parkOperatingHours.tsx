import React from "react";
import { View, Text } from "react-native";

interface ParkOpeningTimesProps {
	parkHours: {
		opening_time: string | null;
		closing_time: string | null;
		is_open: boolean;
		local_current_time: string;
	} | null;
	loading?: boolean;
}

export function ParkOpeningTimes({ parkHours, loading }: ParkOpeningTimesProps) {
	const formatTime = (timeString: string | null): string => {
		if (!timeString) return "N/A";

		try {
			const date = new Date(timeString);
			return date.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			});
		} catch (error) {
			return "N/A";
		}
	};

	if (loading) {
		return (
			<View
				style={{
					marginHorizontal: 16,
					marginBottom: 12,
					marginTop: -32,
					zIndex: -1,
					backgroundColor: "#f0f0f0",
					padding: 16,
					paddingBottom: 12,
					paddingTop: 24,
					borderBottomRightRadius: 8,
					borderBottomLeftRadius: 8,
				}}
			>
				<Text style={{ fontSize: 14, fontWeight: "bold", color: "#666" }}>Loading park hours...</Text>
			</View>
		);
	}

	if (!parkHours) {
		return (
			<View
				style={{
					marginHorizontal: 16,
					marginBottom: 12,
					marginTop: -32,
					zIndex: -1,
					backgroundColor: "#f8d7da",
					padding: 16,
					paddingBottom: 12,
					paddingTop: 32,
					borderBottomRightRadius: 8,
					borderBottomLeftRadius: 8,
				}}
			>
				<Text style={{ fontSize: 14, fontWeight: "bold", color: "#0E5858" }}>Opening times not available. Try again later.</Text>
			</View>
		);
	}

	if (!parkHours.opening_time || !parkHours.closing_time) {
		return (
			<View
				style={{
					marginHorizontal: 16,
					marginBottom: 12,
					marginTop: -32,
					zIndex: -1,
					backgroundColor: "#f8d7da",
					padding: 16,
					paddingBottom: 12,
					paddingTop: 32,
					borderBottomRightRadius: 8,
					borderBottomLeftRadius: 8,
				}}
			>
				<Text style={{ fontSize: 14, fontWeight: "bold", color: "#0E5858" }}>The park is closed today.</Text>
			</View>
		);
	}

	return (
		<View
			style={{
				marginHorizontal: 16,
				marginBottom: 12,
				marginTop: -32,
				zIndex: -1,
				backgroundColor: parkHours.is_open ? "#e0f7fa" : "#fff3cd",
				padding: 16,
				paddingBottom: 12,
				paddingTop: 24,
				borderBottomRightRadius: 8,
				borderBottomLeftRadius: 8,
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
			}}
		>
			<View>
				<Text style={{ fontSize: 14, fontWeight: "bold", color: "#0E5858" }}>Park Hours {parkHours.is_open ? "(Open)" : "(Closed)"}</Text>
				<Text style={{ fontSize: 12, color: "#0E5858", marginTop: 2 }}>Local time: {formatTime(parkHours.local_current_time)}</Text>
			</View>
			<Text style={{ fontSize: 14, color: "#0E5858" }}>
				{formatTime(parkHours.opening_time)}–{formatTime(parkHours.closing_time)}
			</Text>
		</View>
	);
}
