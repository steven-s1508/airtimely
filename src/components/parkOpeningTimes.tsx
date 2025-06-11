// React / React Native Imports
import React from "react";
import { View, Text } from "react-native";

export function ParkOpeningTimes({ hasOpeningTimes, openToday, openingTime, closingTime, formatTime }: { hasOpeningTimes: boolean; openToday: boolean; openingTime: string | null; closingTime: string | null; formatTime: (time: string | null) => string }) {
	if (!hasOpeningTimes) {
		return (
			<View style={{ marginHorizontal: 16, marginBottom: 12, marginTop: -32, zIndex: -1, backgroundColor: "#f8d7da", padding: 16, paddingBottom: 12, paddingTop: 32, borderBottomRightRadius: 8, borderBottomLeftRadius: 8 }}>
				<Text style={{ fontSize: 14, fontWeight: "bold", color: "#0E5858" }}>Opening times not available. Try again later.</Text>
			</View>
		);
	}
	if (!openToday) {
		return (
			<View style={{ marginHorizontal: 16, marginBottom: 12, marginTop: -32, zIndex: -1, backgroundColor: "#f8d7da", padding: 16, paddingBottom: 12, paddingTop: 32, borderBottomRightRadius: 8, borderBottomLeftRadius: 8 }}>
				<Text style={{ fontSize: 14, fontWeight: "bold", color: "#0E5858" }}>The park is closed today.</Text>
			</View>
		);
	}
	return (
		<View style={{ marginHorizontal: 16, marginBottom: 12, marginTop: -32, zIndex: -1, backgroundColor: "#e0f7fa", padding: 16, paddingBottom: 12, paddingTop: 24, borderBottomRightRadius: 8, borderBottomLeftRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
			<Text style={{ fontSize: 14, fontWeight: "bold", color: "#0E5858" }}>Park Opening Times</Text>
			<Text style={{ fontSize: 14, color: "#0E5858" }}>
				{formatTime(openingTime)}–{formatTime(closingTime)}
			</Text>
		</View>
	);
}
