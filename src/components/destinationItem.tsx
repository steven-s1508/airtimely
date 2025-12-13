import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DisplayableEntity } from "./destinationList";
import { StatusBadge } from "@/src/components/statusBadge";
import { CountryBadge } from "@/src/components/countryBadge";
import { Icon } from "@/src/components/Icon";
import { View } from "react-native";
import { Pressable, Text, VStack, HStack } from "@/src/components/ui";
import { fetchChildParks } from "@/src/utils/api/getParksByDestination";
import { useRouter } from "expo-router";
import { getParkStatus, getDestinationStatus, getParksWithStatus, type ParkStatus, type ParkWithStatus } from "@/src/utils/api/getParkStatus";

// Style imports
import { colors, styles, cardStyles, favoriteButtonStyles, destinationItemStyles, destinationParkChildrenStyles, skeletonDestinationItemStyles } from "@/src/styles";

export const DestinationItem = React.memo(
	function DestinationItem({ item, isPinned, onTogglePin }: { item: DisplayableEntity; isPinned: boolean; onTogglePin: (entityId: string) => void }) {
		const router = useRouter();

		const [status, setStatus] = useState<ParkStatus>("Unknown");
		const [isLoadingStatus, setIsLoadingStatus] = useState(true);
		const [childParks, setChildParks] = useState<ParkWithStatus[]>([]);
		const [isLoadingParks, setIsLoadingParks] = useState(false);
		const [errorLoadingParks, setErrorLoadingParks] = useState<string | null>(null);

		const country = item.country_code || "N/A";
		const isParkTypeDisplay = item.entity_type === "park";

		// Memoize callbacks
		const handleTogglePin = useCallback(() => {
			onTogglePin(item.entity_id || "");
		}, [onTogglePin, item.entity_id]);

		const handleParkPress = useCallback(() => {
			router.push({ pathname: "/park/[id]", params: { id: item.entity_id, name: item.name, country_code: item.country_code } });
		}, [router, item.entity_id, item.name]);

		// Load park status for single parks
		useEffect(() => {
			if (isParkTypeDisplay && item.entity_id) {
				const loadParkStatus = async () => {
					setIsLoadingStatus(true);
					try {
						const parkStatus = await getParkStatus(item.entity_id!);
						setStatus(parkStatus);
					} catch (error) {
						console.error("Failed to load park status:", error);
						setStatus("Unknown");
					} finally {
						setIsLoadingStatus(false);
					}
				};
				loadParkStatus();
			} else {
				setIsLoadingStatus(false); // Not a park, no status loading needed
			}
		}, [isParkTypeDisplay, item.entity_id]);

		useEffect(() => {
			if (item.entity_type === "destination_group" && item.original_destination_id) {
				const loadChildParks = async () => {
					setIsLoadingParks(true);
					setIsLoadingStatus(true);
					setErrorLoadingParks(null);

					try {
						// Use item.original_destination_id which refers to the 'destinations' table id
						const parks = await fetchChildParks(item.original_destination_id!);

						// Get destination status and individual park statuses
						const [destinationStatus, parksWithStatus] = await Promise.all([getDestinationStatus(parks), getParksWithStatus(parks)]);

						setStatus(destinationStatus);
						setChildParks(parksWithStatus);
					} catch (e) {
						console.error("Failed to load child parks:", e);
						setErrorLoadingParks("Failed to load parks for this group.");
						setChildParks([]);
						setStatus("Unknown");
					} finally {
						setIsLoadingParks(false);
						setIsLoadingStatus(false);
					}
				};
				loadChildParks();
			} else if (item.entity_type === "destination_group") {
				setChildParks([]); // Clear if not a destination group or no ID
				setIsLoadingStatus(false);
			}
		}, [item.entity_type, item.original_destination_id, item.entity_id, item.name]);

		// Memoize styling calculations
		const iconColor = useMemo(() => {
			return status.toLowerCase() === "open" ? destinationItemStyles.icon.color : status.toLowerCase() === "closed" ? destinationItemStyles.iconClosed.color : destinationItemStyles.icon.color;
		}, [status]);

		const textStyles = useMemo(() => {
			return status.toLowerCase() === "open" ? destinationItemStyles.name : status.toLowerCase() === "closed" ? destinationItemStyles.nameClosed : destinationItemStyles.name;
		}, [status]);

		// Memoize child park renderers
		const renderChildPark = useCallback(
			(park: ParkWithStatus) => {
				// Apply status-based styling to individual park items
				const color = park.status.toLowerCase() === "open" ? colors.text.primary : park.status.toLowerCase() === "closed" ? colors.text.closed : colors.secondaryVeryLight;

				const textStyles = park.status.toLowerCase() === "open" ? [cardStyles.pressableParkText] : park.status.toLowerCase() === "closed" ? [cardStyles.pressableParkText, cardStyles.pressableParkTextClosed] : [cardStyles.pressableParkText];

				const handleChildParkPress = () => {
					router.push({ pathname: "/park/[id]", params: { id: park.id, name: park.name, country_code: park.country_code, status: park.status } });
				};

				return (
					<Pressable key={park.id} onPress={handleChildParkPress}>
						{({ pressed }) =>
							park.status.toLowerCase() === "open" ? (
								<View style={[cardStyles.pressablePark, pressed ? cardStyles.pressableParkPressed : null]}>
									<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
										<StatusBadge type="round" status={park.status} />
										<Text style={[textStyles]}>{park.name_override || park.name}</Text>
									</HStack>
									<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
										<Icon name="chevronRight" fill={color} height={24} width={24} />
									</View>
								</View>
							) : park.status.toLowerCase() === "closed" ? (
								<View style={[cardStyles.pressableParkClosed, pressed ? cardStyles.pressableParkClosedPressed : null]}>
									<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
										<StatusBadge type="round" status={park.status} />
										<Text style={[textStyles]}>{park.name_override || park.name}</Text>
									</HStack>
									<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
										<Icon name="chevronRight" fill={color} height={24} width={24} />
									</View>
								</View>
							) : null
						}
					</Pressable>
				);
			},
			[router, status]
		);

		if (isLoadingStatus) {
			return <SkeletonDestinationItem />;
		}

		if (!isParkTypeDisplay) {
			// This is a 'destination_group'
			return (
				<View style={[status.toLowerCase() === "open" ? [cardStyles.default, cardStyles.cardOpen] : null, status.toLowerCase() === "closed" ? [cardStyles.default, cardStyles.cardClosed] : null]}>
					<HStack style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
						<StatusBadge type="corner" status={status} />
						<CountryBadge country={country} status={status} />
						{!isPinned ? (
							<Pressable onPress={handleTogglePin}>
								{({ pressed }) => (
									<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pressed] : favoriteButtonStyles.container}>
										<Icon name="favorite" fill={colors.favorite.icon.default} height={20} width={20} />
									</View>
								)}
							</Pressable>
						) : (
							<Pressable onPress={handleTogglePin}>
								{({ pressed }) => (
									<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pinned, favoriteButtonStyles.pinnedPressed] : [favoriteButtonStyles.container, favoriteButtonStyles.pinned]}>
										<Icon name="favoriteFilled" fill={colors.favorite.icon.pinned} height={20} width={20} />
									</View>
								)}
							</Pressable>
						)}
					</HStack>
					<View style={cardStyles.cardBody}>
						<View style={[destinationItemStyles.titleContainer]}>
							<View style={destinationItemStyles.nameContainer}>
								<Text style={textStyles}>{item.name}</Text>
							</View>
						</View>

						{isLoadingParks && <Text style={{ color: colors.primaryLight, paddingVertical: 8 }}>Loading parks...</Text>}
						{errorLoadingParks && <Text style={{ color: colors.highWaitingtime, paddingVertical: 8 }}>{errorLoadingParks}</Text>}

						{!isLoadingParks && !errorLoadingParks && childParks.length > 0 && <VStack style={cardStyles.parksContainer}>{childParks.map(renderChildPark)}</VStack>}
						{!isLoadingParks && !errorLoadingParks && childParks.length === 0 && item.entity_type === "destination_group" && <Text style={{ color: colors.secondaryLight, paddingVertical: 8 }}>No individual parks listed under this group.</Text>}
					</View>
				</View>
			);
		} else {
			// This is a 'park' type display
			return (
				<View style={[status.toLowerCase() === "open" ? [cardStyles.default, cardStyles.isPark, cardStyles.cardOpen] : null, status.toLowerCase() === "closed" ? [cardStyles.default, cardStyles.isPark, cardStyles.cardClosed] : null]}>
					<VStack style={destinationItemStyles.containerInner}>
						<HStack style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
							<StatusBadge type="corner" status={status} />
							<CountryBadge country={country} status={status} />
							{!isPinned ? (
								<Pressable onPress={handleTogglePin}>
									{({ pressed }) => (
										<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pressed] : favoriteButtonStyles.container}>
											<Icon name="favorite" fill={colors.favorite.icon.default} height={20} width={20} />
										</View>
									)}
								</Pressable>
							) : (
								<Pressable onPress={handleTogglePin}>
									{({ pressed }) => (
										<View style={pressed ? [favoriteButtonStyles.container, favoriteButtonStyles.pinned, favoriteButtonStyles.pinnedPressed] : [favoriteButtonStyles.container, favoriteButtonStyles.pinned]}>
											<Icon name="favoriteFilled" fill={colors.favorite.icon.pinned} height={20} width={20} />
										</View>
									)}
								</Pressable>
							)}
						</HStack>
						<Pressable onPress={handleParkPress}>
							{({ pressed }) =>
								status.toLowerCase() === "open" ? (
									<View style={pressed ? [cardStyles.pressableDestination, cardStyles.pressableDestinationPressed] : [cardStyles.pressableDestination]}>
										<Text style={[cardStyles.cardTitle, cardStyles.cardTitleOpen]}>{item.name}</Text>
										<Icon name="chevronRight" fill={iconColor} height={24} width={24} />
									</View>
								) : status.toLowerCase() === "closed" ? (
									<View style={pressed ? [cardStyles.pressableDestination, cardStyles.pressableDestinationClosedPressed] : [cardStyles.pressableDestination]}>
										<Text style={[cardStyles.cardTitle, cardStyles.cardTitleClosed]}>{item.name}</Text>
										<Icon name="chevronRight" fill={iconColor} height={24} width={24} />
									</View>
								) : null
							}
						</Pressable>
					</VStack>
				</View>
			);
		}
	},
	(prevProps, nextProps) => {
		// Custom comparison function for better memoization
		return prevProps.item.entity_id === nextProps.item.entity_id && prevProps.isPinned === nextProps.isPinned && prevProps.item.name === nextProps.item.name && prevProps.item.entity_type === nextProps.item.entity_type;
	}
);

export const SkeletonDestinationItem = React.memo(function SkeletonDestinationItem() {
	return (
		<View style={skeletonDestinationItemStyles.container}>
			<VStack style={skeletonDestinationItemStyles.containerInner}>
				<View style={skeletonDestinationItemStyles.header}>
					<View style={skeletonDestinationItemStyles.statusBadge} />
					<View style={skeletonDestinationItemStyles.countryBadge} />
					<View style={skeletonDestinationItemStyles.favoriteButton} />
				</View>
				<View style={skeletonDestinationItemStyles.body}>
					<View style={skeletonDestinationItemStyles.titleContainer}>
						<View style={skeletonDestinationItemStyles.titleBar} />
					</View>
				</View>
			</VStack>
		</View>
	);
});
