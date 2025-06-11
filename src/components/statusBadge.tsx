import { View } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationStatusBadgeStyles } from "@/src/styles";

export function StatusBadge({ status }: { status: string }) {
	return (
		<View className={`status-badge status-${status.toLowerCase()}`} style={destinationStatusBadgeStyles.statusBadgeContainer}>
			<Icon name={status.toLowerCase()} fill={colors.primaryVeryLight} height={14} width={14} />
			<Text style={destinationStatusBadgeStyles.statusBadgeText}>{status}</Text>
		</View>
	);
}
