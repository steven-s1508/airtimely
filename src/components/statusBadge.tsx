import React from "react";
import { View } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationStatusBadgeStyles, parkStatusStyles } from "@/src/styles";

export const StatusBadge = React.memo(function StatusBadge({ type, status }: { type: string; status: string }) {

	if (type.toLowerCase() === "corner") {
		return status.toLowerCase() === "open" ? (
			<View style={[parkStatusStyles.destination, parkStatusStyles.open]}>
				<Icon name="check" fill={colors.parkStatus.onBg.open} size={20}/>
			</View>
		) : (
			<View style={[parkStatusStyles.destination, parkStatusStyles.closed]}>
				<Icon name="closed" fill={colors.parkStatus.onBg.closed} size={20}/>
			</View>
		);
	} else if (type.toLowerCase() === "round") {
		return status.toLowerCase() === "open" ? (
			<View style={[parkStatusStyles.park, parkStatusStyles.open]}>
				<Icon name="check" fill={colors.parkStatus.onBg.open} size={14}/>
			</View>
		) : (
			<View style={[parkStatusStyles.park, parkStatusStyles.closed]}>
				<Icon name="closed" fill={colors.parkStatus.onBg.closed} size={12}/>
			</View>
		);
	}
});
