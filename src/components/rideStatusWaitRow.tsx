import React from "react";
import { Text } from "react-native";
import { Icon } from "@/src/components/Icon";
import { WaitTimePill } from "@/src/components/waitTimePill";
import { colors, tokens } from "@/src/styles";
import { HStack } from "./ui";

export type RideStatusKey = "open" | "down" | "refurbishment" | "closed";
type WaitType = "standby" | "singleRider";
type RideStatusWaitRowVariant = "embedded" | "pill";

export function getRideStatusKey(status?: string | null): RideStatusKey {
	switch (status?.toLowerCase()) {
		case "operating":
		case "open":
			return "open";
		case "down":
			return "down";
		case "refurbishment":
			return "refurbishment";
		default:
			return "closed";
	}
}

function getStatusLabel(statusKey: RideStatusKey, waitType: WaitType) {
	if (statusKey === "open") {
		return waitType === "singleRider" ? "Single Rider" : "Standby Wait";
	}

	if (statusKey === "down") return "Down";
	if (statusKey === "refurbishment") return "Refurbishment";
	return "Closed";
}

function getStatusIcon(statusKey: RideStatusKey, waitType: WaitType) {
	if (statusKey === "open") {
		return waitType === "singleRider" ? "singleRider" : "waitTime";
	}

	return statusKey === "down" ? "down" : statusKey === "refurbishment" ? "refurbishment" : "closed";
}

interface RideStatusWaitRowProps {
	statusKey: RideStatusKey;
	waitTime?: number | null;
	waitType?: WaitType;
	variant?: RideStatusWaitRowVariant;
	showBorderLeft?: boolean;
}

export const RideStatusWaitRow = React.memo(function RideStatusWaitRow({ statusKey, waitTime = 0, waitType = "standby", variant = "embedded", showBorderLeft = false }: RideStatusWaitRowProps) {
	const colorSet = colors.card.attraction.status[statusKey];
	const isOpen = statusKey === "open";
	const shouldShowWaitTime = isOpen;
	const iconSize = variant === "pill" && !isOpen ? 24 : 16;

	return (
		<HStack
			style={[
				{
					flex: 1,
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					paddingLeft: 8,
					paddingRight: 6,
					paddingTop: 4,
					paddingBottom: 6,
				},
				variant === "pill" && {
					borderRadius: 6,
					backgroundColor: colorSet.bg,
					borderWidth: 1,
					borderColor: colorSet.border,
				},
				variant === "pill" && !isOpen && {
					padding: 6,
				},
				showBorderLeft && {
					borderLeftWidth: 1,
					borderLeftColor: colorSet.border,
				},
			]}
		>
			<Icon name={getStatusIcon(statusKey, waitType)} fill={colorSet.onBg} height={iconSize} width={iconSize} />
			<Text style={{ flex: 1, color: colorSet.onBg, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>{getStatusLabel(statusKey, waitType)}</Text>
			{shouldShowWaitTime && <WaitTimePill waitTime={waitTime || 0} />}
		</HStack>
	);
});