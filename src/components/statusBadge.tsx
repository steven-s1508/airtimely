import React from "react";
import { View } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationStatusBadgeStyles } from "@/src/styles";

export const StatusBadge = React.memo(function StatusBadge({ status, size = 24 }: { status: string; size?: number }) {
	const getStatusConfig = (status: string) => {
		switch (status.toLowerCase()) {
			case "open":
				return {
					containerStyle: destinationStatusBadgeStyles.containerOpen,
					containerSize: size,
					iconColor: destinationStatusBadgeStyles.iconOpen.color,
					textColor: destinationStatusBadgeStyles.textOpen,
					iconSize: size - 3,
					iconName: "check", // or whatever icon you have for open
				};
			case "closed":
				return {
					containerStyle: destinationStatusBadgeStyles.containerClosed,
					containerSize: size,
					iconColor: destinationStatusBadgeStyles.iconClosed.color,
					textColor: destinationStatusBadgeStyles.textClosed,
					iconSize: size - 6,
					iconName: "closed", // or whatever icon you have for closed
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
		<View className={`status-badge status-${status.toLowerCase()}`} style={[destinationStatusBadgeStyles.container, config.containerStyle, { width: config.containerSize, height: config.containerSize }]}>
			<Icon name={config.iconName} fill={config.iconColor} height={config.iconSize} width={config.iconSize} />
			{/* <Text style={[destinationStatusBadgeStyles.text, config.textColor]}>{status}</Text> */}
		</View>
	);
});
