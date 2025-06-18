import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DisplayableEntity } from "./destinationList";
import { StatusBadge } from "@/src/components/statusBadge";
import { CountryBadge } from "@/src/components/countryBadge";
import { Icon } from "@/src/components/Icon";
import { View } from "react-native";
import { Pressable, Text, VStack, HStack } from "@/src/components/ui";
import { colors, destinationItemStyles, destinationParkChildrenStyles, skeletonDestinationItemStyles } from "@/src/styles";
import { fetchChildParks } from "@/app/api/get/getParksByDestination";
import { useRouter } from "expo-router";
import { getParkStatus, getDestinationStatus, getParksWithStatus, type ParkStatus, type ParkWithStatus } from "@/app/api/get/getParkStatus";

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
			onTogglePin(item.entity_id);
		}, [onTogglePin, item.entity_id]);

		const handleParkPress = useCallback(() => {
			router.push({ pathname: "/park/[id]", params: { id: item.entity_id, name: item.name, country_code: item.country_code, external_id: item.external_id } });
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
		}, [item.entity_type, item.original_destination_id]);

		// Memoize styling calculations
		const containerStyle = useMemo(() => {
			return status.toLowerCase() === "open" ? destinationItemStyles.containerOpen : status.toLowerCase() === "closed" ? destinationItemStyles.containerClosed : destinationItemStyles.container;
		}, [status]);

		const borderBottomColor = useMemo(() => {
			return status.toLowerCase() === "open" ? colors.primaryDark : status.toLowerCase() === "closed" ? colors.secondaryDark : colors.secondaryDark;
		}, [status]);

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
				const parkContainerStyle = park.status.toLowerCase() === "open" ? destinationParkChildrenStyles.containerOpen : park.status.toLowerCase() === "closed" ? destinationParkChildrenStyles.containerClosed : destinationParkChildrenStyles.container;

				const color = park.status.toLowerCase() === "open" ? colors.primaryVeryLight : park.status.toLowerCase() === "closed" ? colors.secondaryLight : colors.secondaryVeryLight;

				const textStyles = park.status.toLowerCase() === "open" ? destinationParkChildrenStyles.name : park.status.toLowerCase() === "closed" ? destinationParkChildrenStyles.nameClosed : destinationParkChildrenStyles.name;

				const handleChildParkPress = () => {
					router.push({ pathname: "/park/[id]", params: { id: park.id, name: park.name, country_code: park.country_code, status: park.status } });
				};

				return (
					<Pressable key={park.id} style={[destinationParkChildrenStyles.container, parkContainerStyle]} android_ripple={{ color: `${colors.primary}86`, foreground: true }} onPress={handleChildParkPress}>
						<View style={destinationParkChildrenStyles.nameContainer}>
							<Icon name="park" fill={color} height={18} width={18} />
							<Text style={[textStyles, { fontSize: 18 }]}>{park.name_override || park.name}</Text>
						</View>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
							<Icon name="chevronRight" fill={color} height={24} width={24} />
						</View>
					</Pressable>
				);
			},
			[router]
		);

		if (isLoadingStatus) {
			return <SkeletonDestinationItem />;
		}

		if (!isParkTypeDisplay) {
			// This is a 'destination_group'
			return (
				<View style={[destinationItemStyles.container, containerStyle]}>
					<VStack style={destinationItemStyles.containerInner}>
						<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
							<View style={destinationItemStyles.metadata}>
								<StatusBadge status={status} />
								<CountryBadge country={country} status={status} />
							</View>
							{!isPinned ? (
								<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={handleTogglePin} style={{ borderRadius: 8, overflow: "hidden" }}>
									<View style={{ padding: 6, backgroundColor: colors.primaryBlack, borderWidth: 2, borderColor: colors.primary, borderRadius: 8, overflow: "hidden" }}>
										<Icon name="favorite" fill={colors.primaryLight} height={21} width={21} />
									</View>
								</Pressable>
							) : (
								<Pressable android_ripple={{ color: colors.primaryTransparentDark, foreground: true }} onPress={handleTogglePin} style={{ borderRadius: 8, overflow: "hidden" }}>
									<View style={{ padding: 6, borderWidth: 2, borderColor: colors.primaryLight, backgroundColor: colors.primaryBlack, borderRadius: 8, overflow: "hidden" }}>
										<Icon name="favoriteFilled" fill={colors.primaryLight} height={21} width={21} />
									</View>
								</Pressable>
							)}
						</HStack>
						<View style={[destinationItemStyles.titleContainer, { borderBottomColor: borderBottomColor }]}>
							<View style={destinationItemStyles.nameContainer}>
								<Icon name="destination" fill={iconColor} height={24} width={24} />
								<Text style={textStyles}>{item.name}</Text>
							</View>
						</View>

						{isLoadingParks && <Text style={{ color: colors.primaryLight, paddingVertical: 8 }}>Loading parks...</Text>}
						{errorLoadingParks && <Text style={{ color: colors.highWaitingtime, paddingVertical: 8 }}>{errorLoadingParks}</Text>}

						{!isLoadingParks && !errorLoadingParks && childParks.length > 0 && <VStack style={destinationParkChildrenStyles.listContainer}>{childParks.map(renderChildPark)}</VStack>}
						{!isLoadingParks && !errorLoadingParks && childParks.length === 0 && item.entity_type === "destination_group" && <Text style={{ color: colors.secondaryLight, paddingVertical: 8 }}>No individual parks listed under this group.</Text>}
					</VStack>
				</View>
			);
		} else {
			// This is a 'park' type display
			return (
				<View style={[destinationItemStyles.container, containerStyle]}>
					<VStack style={destinationItemStyles.containerInner}>
						<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
							<View style={destinationItemStyles.metadata}>
								<StatusBadge status={status} />
								<CountryBadge country={country} status={status} />
							</View>
							{!isPinned ? (
								<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={handleTogglePin} style={{ borderRadius: 8, overflow: "hidden" }}>
									<View style={{ padding: 6, backgroundColor: colors.primaryBlack, borderWidth: 2, borderColor: colors.primary, borderRadius: 8, overflow: "hidden" }}>
										<Icon name="favorite" fill={colors.primaryLight} height={21} width={21} />
									</View>
								</Pressable>
							) : (
								<Pressable android_ripple={{ color: colors.primaryTransparentDark, foreground: true }} onPress={handleTogglePin} style={{ borderRadius: 8, overflow: "hidden" }}>
									<View style={{ padding: 6, borderWidth: 2, borderColor: colors.primaryLight, backgroundColor: colors.primaryBlack, borderRadius: 8, overflow: "hidden" }}>
										<Icon name="favoriteFilled" fill={colors.primaryLight} height={21} width={21} />
									</View>
								</Pressable>
							)}
						</HStack>
						<Pressable style={destinationItemStyles.titleContainerPark} android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={handleParkPress}>
							<View style={destinationItemStyles.nameContainer}>
								<Icon name="park" fill={iconColor} height={24} width={24} />
								<Text style={textStyles}>{item.name}</Text>
							</View>
							<Icon name="chevronRight" fill={iconColor} height={24} width={24} />
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

export function SkeletonDestinationItem() {
	return (
		<View style={skeletonDestinationItemStyles.destinationItemContainer}>
			<VStack style={skeletonDestinationItemStyles.destinationItemContainerInner}>
				<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.primaryVeryDark }}>
					<View style={skeletonDestinationItemStyles.destinationItemMetadata}>
						<View style={skeletonDestinationItemStyles.statusBadge} />
						<View style={skeletonDestinationItemStyles.countryBadge} />
					</View>
					<View style={{ padding: 4, borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 4, overflow: "hidden" }}>
						<View style={{ height: 16, width: 16, backgroundColor: colors.primary }} />
					</View>
				</HStack>
				<View style={skeletonDestinationItemStyles.destinationTitleContainer}>
					<View style={skeletonDestinationItemStyles.destinationNameContainer}>
						<View style={skeletonDestinationItemStyles.destinationName}></View>
					</View>
				</View>
			</VStack>
		</View>
	);
}
