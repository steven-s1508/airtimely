import React from "react";
import { View } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, rideStatusBadgeStyles } from "@/src/styles";

export const RideStatusBadge = React.memo(function StatusBadge({ status }: { status: string }) {
	const getStatusConfig = (status: string) => {
		switch (status.toLowerCase()) {
			case "operating":
				return {
					containerStyle: rideStatusBadgeStyles.containerOpen,
					iconColor: rideStatusBadgeStyles.iconOpen.color,
					textColor: rideStatusBadgeStyles.textOpen,
					iconName: "open", // or whatever icon you have for open
					statusText: "Operating",
				};
			case "closed":
				return {
					containerStyle: rideStatusBadgeStyles.containerClosed,
					iconColor: rideStatusBadgeStyles.iconClosed.color,
					textColor: rideStatusBadgeStyles.textClosed,
					iconName: "closed", // or whatever icon you have for closed
					statusText: "Closed",
				};
			case "down":
				return {
					containerStyle: "#211213",
					iconColor: "#A3000E",
					textColor: "#FFCCD9",
					iconName: "down", // or whatever icon you have for down
					statusText: "Down",
				};
			case "refurbishment":
				return {
					containerStyle: rideStatusBadgeStyles.containerRefurbishment,
					iconColor: rideStatusBadgeStyles.iconRefurbishment.color,
					textColor: rideStatusBadgeStyles.textRefurbishment,
					iconName: "refurbishment", // or whatever icon you have for refurbishment
					statusText: "Refurbishment",
				};
			case "unknown":
			default:
				return {
					containerStyle: { backgroundColor: colors.secondaryVeryDark, borderColor: colors.secondaryLight },
					iconColor: colors.secondaryLight,
					textColor: { color: colors.secondaryLight },
					iconName: "down", // or whatever icon you have for unknown
				};
		}
	};

	const config = getStatusConfig(status);

	return (
		<View className={`status-badge status-${status.toLowerCase()}`} style={[rideStatusBadgeStyles.container]}>
			<Icon name={config.iconName} fill={config.iconColor} height={14} width={14} />
			<Text style={[rideStatusBadgeStyles.text]}>{config.statusText}</Text>
		</View>
	);
});
