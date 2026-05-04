import React from "react";
import { View } from "react-native";
import { Text } from "@/src/components/ui";
import { colors, tokens } from "@/src/styles/styles";

function getWaitTimeGrade(waitTime: number) {
	if (waitTime < 45) return colors.rideStatus.lowWait;
	if (waitTime < 60) return colors.rideStatus.mediumWait;
	return colors.rideStatus.highWait;
}

export const WaitTimePill = React.memo(function WaitTimePill({ waitTime }: { waitTime: number }) {
	const grade = getWaitTimeGrade(waitTime);

	return (
		<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: grade.bg, borderColor: grade.border, borderWidth: 1, paddingHorizontal: 2, paddingVertical: 4, borderRadius: 8, minWidth: 32 }}>
			<Text style={{ color: grade.onBg, textAlign: "center", fontFamily: "IBM Plex Sans Condensed", fontSize: tokens.text.size[100], lineHeight: tokens.text.size[100] * 1.4, fontWeight: "bold" }}>{waitTime}</Text>
		</View>
	);
});
