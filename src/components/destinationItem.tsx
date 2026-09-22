import React, { useCallback } from "react";
import { DisplayableEntity } from "./destinationList";
import { StatusBadge } from "@/src/components/statusBadge";
import { CountryBadge } from "@/src/components/countryBadge";
import { Icon } from "@/src/components/Icon";
import { View } from "react-native";
import { Pressable, Text, VStack, HStack } from "@/src/components/ui";
import { useRouter } from "expo-router";
import { type ParkStatus } from "@/src/utils/api/getParkStatus";
import { type ParkWithStatus } from "@/src/utils/api/getDisplayableEntities";
import { usePinnedItemsStore } from "@/src/stores/pinnedItemsStore";

// Style imports
import { colors, tokens, cardStyles, favoriteButtonStyles, destinationItemStyles, parkButtonStyles, skeletonDestinationItemStyles, base } from "@/src/styles";

export const DestinationItem = React.memo(
	function DestinationItem({ item, isPinned, onTogglePin, currentStatus = "Unknown", childParks = [] }: { item: DisplayableEntity; isPinned: boolean; onTogglePin: (entityId: string) => void; currentStatus?: ParkStatus; childParks?: ParkWithStatus[] }) {
		const router = useRouter();
		const { addPinnedDestination, removePinnedDestination, isDestinationPinned, addPinnedPark, removePinnedPark, isParkPinned } = usePinnedItemsStore();

		const country = item.countryCode || "N/A";
		const isParkTypeDisplay = item.kind === "park";
		const status = currentStatus;

		// Memoize callbacks
		const handleTogglePin = useCallback(() => {
			if (item.kind === "park") {
				if (isParkPinned(item.id)) {
					removePinnedPark(item.id);
				} else {
					addPinnedPark(item.id);
				}
			} else {
				if (isDestinationPinned(item.id)) {
					removePinnedDestination(item.id);
				} else {
					addPinnedDestination(item.id);
				}
			}
			onTogglePin(item.id);
		}, [onTogglePin, item.id, item.kind, isDestinationPinned, addPinnedDestination, removePinnedDestination, isParkPinned, addPinnedPark, removePinnedPark]);

		const statusKey = (status.toLowerCase() === "open" || status.toLowerCase() === "closed") ? status.toLowerCase() as "open" | "closed" : "closed";

		// A standalone park's card holds exactly that park.
		const parksToRender: ParkWithStatus[] = childParks;

		return (
			<VStack style={{ borderColor: colors.card.destination[statusKey].border, backgroundColor: colors.card.destination[statusKey].bg, borderWidth: 1, borderRadius: 6, marginBottom: 16, overflow: "hidden" }}>
				<VStack style={{ paddingBottom: 2 }}>
					{/* Header */}
					<HStack style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
						<View style={{ paddingLeft: 6, paddingTop: 4, paddingBottom: 2 }}>
							<CountryBadge country={country} status={status} />
						</View>
						{!isPinned ? (
							<Pressable accessibilityRole="button" accessibilityLabel={`Pin ${item.name || "destination"}`} onPress={handleTogglePin}>
								{({ pressed }) => (
									<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pressed] : favoriteButtonStyles.container}>
										<Icon name="favorite" fill={colors.favorite.icon.default} height={20} width={20} />
									</View>
								)}
							</Pressable>
						) : (
							<Pressable accessibilityRole="button" accessibilityLabel={`Unpin ${item.name || "destination"}`} onPress={handleTogglePin}>
								{({ pressed }) => (
									<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pinned, favoriteButtonStyles.pinnedPressed] : [favoriteButtonStyles.container, favoriteButtonStyles.pinned]}>
										<Icon name="favoriteFilled" fill={colors.favorite.icon.pinned} height={20} width={20} />
									</View>
								)}
							</Pressable>
						)}
					</HStack>
					{!isParkTypeDisplay && (
						<View style={{ paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 }}>
							<Text style={{ color: colors.card.destination[statusKey].title, fontFamily: "Noto Sans", fontSize: tokens.text.size[90], lineHeight: tokens.text.size[90] * 1.2, fontWeight: "600" }}>{item.name}</Text>
						</View>
					)}
				</VStack>
				<VStack>
					{/* Park Buttons */}
					{parksToRender.length === 0 && !isParkTypeDisplay && (
						<Text style={{ color: base.secondary[800], paddingVertical: 8, paddingHorizontal: 8 }}>No individual parks listed under this group.</Text>
					)}
					{parksToRender.map((park) => {
						const parkStatusKey = (park.status.toLowerCase() === "open" || park.status.toLowerCase() === "closed") ? park.status.toLowerCase() as "open" | "closed" : "closed";
						return (
							<Pressable key={park.id} accessibilityRole="button" accessibilityLabel={`Open ${park.name}`} onPress={() => router.push({ pathname: "/park/[parkId]", params: { id: park.id, name: park.name, country_code: park.countryCode ?? "", status: park.status } })}>
								{({ pressed }) => (
									<View style={[parkButtonStyles.container, pressed ? { backgroundColor: colors.card.destination.pressable[parkStatusKey].bgPressed } : { backgroundColor: colors.card.destination.pressable[parkStatusKey].bg }, { borderTopColor: colors.card.destination.pressable[parkStatusKey].border }]}>
										<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
											<StatusBadge type="round" status={park.status} />
											<Text style={{ color: colors.card.destination.pressable[parkStatusKey].onBg, fontFamily: "Noto Sans Condensed", fontSize: tokens.text.size[300], lineHeight: tokens.text.size[300] * 1.3, fontWeight: "700" }}>{park.name}</Text>
										</HStack>
										<Icon name="chevronRight" fill={colors.card.destination.pressable[parkStatusKey].onBg} height={24} width={24} />
									</View>
								)}
							</Pressable>
						);
					})}
				</VStack>
			</VStack>
		);
	},
	(prevProps, nextProps) => {
		// Custom comparison function for better memoization
		return prevProps.item.id === nextProps.item.id && prevProps.isPinned === nextProps.isPinned && prevProps.item.name === nextProps.item.name && prevProps.item.kind === nextProps.item.kind && prevProps.currentStatus === nextProps.currentStatus && prevProps.childParks === nextProps.childParks;
	}
);

export const SkeletonDestinationItem = React.memo(function SkeletonDestinationItem() {
	return (
		<View style={skeletonDestinationItemStyles.container}>
			{/* Header */}
			<View style={skeletonDestinationItemStyles.header}>
				<View style={skeletonDestinationItemStyles.countryBadge} />
				<View style={skeletonDestinationItemStyles.favoriteButton} />
			</View>
			{/* Title */}
			<View style={skeletonDestinationItemStyles.titleContainer}>
				<View style={skeletonDestinationItemStyles.titleBar} />
			</View>
			{/* Park button placeholder */}
			<View style={skeletonDestinationItemStyles.parkButton}>
				<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
					<View style={skeletonDestinationItemStyles.parkButtonDot} />
					<View style={skeletonDestinationItemStyles.parkButtonText} />
				</HStack>
				<View style={skeletonDestinationItemStyles.parkButtonChevron} />
			</View>
		</View>
	);
});
