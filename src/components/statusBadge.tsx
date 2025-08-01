import React from "react";
import { View } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationStatusBadgeStyles } from "@/src/styles";

export const StatusBadge = React.memo(function StatusBadge({ status }: { status: string }) {
	const getStatusConfig = (status: string) => {
		switch (status.toLowerCase()) {
			case "open":
				return {
					containerStyle: destinationStatusBadgeStyles.containerOpen,
					iconColor: destinationStatusBadgeStyles.iconOpen.color,
					textColor: destinationStatusBadgeStyles.textOpen,
					iconName: "open", // or whatever icon you have for open
				};
			case "closed":
				return {
					containerStyle: destinationStatusBadgeStyles.containerClosed,
					iconColor: destinationStatusBadgeStyles.iconClosed.color,
					textColor: destinationStatusBadgeStyles.textClosed,
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
		<View className={`status-badge status-${status.toLowerCase()}`} style={[destinationStatusBadgeStyles.container, config.containerStyle]}>
			<Icon name={config.iconName} fill={config.iconColor} height={14} width={14} />
			<Text style={[destinationStatusBadgeStyles.text, config.textColor]}>{status}</Text>
		</View>
	);
});
