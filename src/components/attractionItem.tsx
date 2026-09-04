// React / React Native Imports
import React, { useMemo, useCallback } from "react";
import { View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// Local Imports
import { Text, VStack, HStack, Pressable } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { RideStatusWaitRow, getRideStatusKey } from "@/src/components/rideStatusWaitRow";
import { usePinnedItemsStore } from "@/src/stores/pinnedItemsStore";
import { colors, favoriteButtonStyles, tokens } from "@/src/styles/styles";

export const AttractionItem = React.memo(function AttractionItem({
	id,
	parkId,
	name,
	waitTime,
	status,
	singleRiderWaitTime,
	hasVirtualQueue,
}: {
	id: string;
	parkId: string;
	name: string;
	waitTime?: number;
	status?: string;
	singleRiderWaitTime?: number;
	hasVirtualQueue?: boolean;
}) {
	const router = useRouter();
	const { addPinnedAttraction, removePinnedAttraction, isAttractionPinned } = usePinnedItemsStore();
	const isPinned = isAttractionPinned(id);

	const handleTogglePin = useCallback(() => {
		if (isPinned) {
			removePinnedAttraction(id);
		} else {
			addPinnedAttraction(id);
		}
	}, [id, isPinned, addPinnedAttraction, removePinnedAttraction]);

	const handleRidePress = useCallback(() => {
		router.push({ pathname: `/park/[parkId]/ride/[rideId]`, params: { parkId, rideId: id, name, waitTime, status, singleRiderWaitTime } });
	}, [router, parkId, id, name, waitTime, status, singleRiderWaitTime]);

	const statusKey = useMemo(() => getRideStatusKey(status), [status]);

	const statusRowColors = statusKey === "open" ? colors.rideStatus.lowWait : colors.rideStatus[statusKey];

	return (
		<VStack style={{ borderColor: colors.card.attraction[statusKey].border, backgroundColor: colors.card.attraction[statusKey].bg, borderWidth: 1, borderRadius: 6, overflow: "hidden" }}>
			{/* Header */}
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
				<Pressable accessibilityRole="button" accessibilityLabel={`Open ${name} ride details`} onPress={handleRidePress} style={{ flex: 1 }}>
					{({ pressed }) => (
						<HStack style={[{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 8, paddingVertical: 6, borderBottomRightRadius: 6, borderTopRightRadius: 6, overflow: "hidden" }, pressed && { backgroundColor: colors.card.attraction[statusKey].bgPressed }]}>
							<Text style={{ flex: 1, color: colors.card.attraction[statusKey].title, fontFamily: "Noto Sans", fontSize: tokens.text.size[200], lineHeight: tokens.text.size[200] * 1.2, fontWeight: "700" }}>{name}</Text>
							<Icon name="chevronRight" fill={colors.card.attraction[statusKey].title} height={24} width={24} />
						</HStack>
					)}
				</Pressable>
				{!isPinned ? (
					<Pressable accessibilityRole="button" accessibilityLabel={`Pin ${name}`} onPress={handleTogglePin}>
						{({ pressed }) => (
							<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pressed] : favoriteButtonStyles.container}>
								<Icon name="favorite" fill={colors.favorite.icon.default} height={20} width={20} />
							</View>
						)}
					</Pressable>
				) : (
					<Pressable accessibilityRole="button" accessibilityLabel={`Unpin ${name}`} onPress={handleTogglePin}>
						{({ pressed }) => (
							<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pinned, favoriteButtonStyles.pinnedPressed] : [favoriteButtonStyles.container, favoriteButtonStyles.pinned]}>
								<Icon name="favoriteFilled" fill={colors.favorite.icon.pinned} height={20} width={20} />
							</View>
						)}
					</Pressable>
				)}
			</HStack>
			{/* Status row */}
			<HStack style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.card.attraction.status[statusKey].border, backgroundColor: colors.card.attraction.status[statusKey].bg, minHeight: 36 }}>
				<RideStatusWaitRow statusKey={statusKey} waitTime={waitTime ?? 0} />
				{singleRiderWaitTime !== undefined && (
					<RideStatusWaitRow statusKey={statusKey} waitType={statusKey === "open" ? "singleRider" : "standby"} waitTime={singleRiderWaitTime} showBorderLeft={statusKey === "open"} />
				)}
			</HStack>
		</VStack>
	);
});