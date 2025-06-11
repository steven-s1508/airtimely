import React, { useState, useEffect } from "react";
import { DisplayableEntity } from "./destinationList";
import { StatusBadge } from "@/src/components/statusBadge";
import { CountryBadge } from "@/src/components/countryBadge";
import { Icon } from "@/src/components/Icon";
import { View } from "react-native";
import { Pressable, Text, VStack, HStack } from "@/src/components/ui";
import { colors, destinationItemStyles, destinationParkChildrenStyles, skeletonDestinationItemStyles } from "@/src/styles";
import { supabase } from "@/src/utils/supabase";
import type { Tables } from "@/src/types/database.types";
import { fetchChildParks } from "@/app/api/get/getParksByDestination";
import { useRouter } from "expo-router";

export function DestinationItem({ item, isPinned, onTogglePin }: { item: DisplayableEntity; isPinned: boolean; onTogglePin: (entityId: string) => void }) {
	const router = useRouter();

	const isOpen = "Open"; // Placeholder
	const country = item.country_code || "N/A";
	const isParkTypeDisplay = item.entity_type === "park";

	const [childParks, setChildParks] = useState<Tables<"parks">[]>([]);
	const [isLoadingParks, setIsLoadingParks] = useState(false);
	const [errorLoadingParks, setErrorLoadingParks] = useState<string | null>(null);

	useEffect(() => {
		if (item.entity_type === "destination_group" && item.original_destination_id) {
			const loadChildParks = async () => {
				setIsLoadingParks(true);
				setErrorLoadingParks(null);
				try {
					// Use item.original_destination_id which refers to the 'destinations' table id
					const parks = await fetchChildParks(item.original_destination_id!);
					setChildParks(parks);
				} catch (e) {
					console.error("Failed to load child parks:", e);
					setErrorLoadingParks("Failed to load parks for this group.");
					setChildParks([]);
				} finally {
					setIsLoadingParks(false);
				}
			};
			loadChildParks();
		} else {
			setChildParks([]); // Clear if not a destination group or no ID
		}
	}, [item.entity_type, item.original_destination_id]);

	if (!isParkTypeDisplay) {
		// This is a 'destination_group'
		return (
			<View style={destinationItemStyles.destinationItemContainer}>
				<VStack style={destinationItemStyles.destinationItemContainerInner}>
					<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.primaryVeryDark }}>
						<View style={destinationItemStyles.destinationItemMetadata}>
							<StatusBadge status={isOpen} />
							<CountryBadge country={country} />
						</View>
						{!isPinned ? (
							<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={() => onTogglePin(item.entity_id)}>
								<View style={{ padding: 4, borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 4, overflow: "hidden" }}>
									<Icon name="mapPin" fill={colors.primaryLight} height={16} width={16} />
								</View>
							</Pressable>
						) : (
							<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={() => onTogglePin(item.entity_id)}>
								<View style={{ padding: 4, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.primaryLight, borderRadius: 4, overflow: "hidden" }}>
									<Icon name="mapPin" fill={colors.primaryVeryDark} height={16} width={16} />
								</View>
							</Pressable>
						)}
					</HStack>
					<View style={destinationItemStyles.destinationTitleContainer}>
						<View style={destinationItemStyles.destinationNameContainer}>
							<Icon name="destination" fill={colors.primaryVeryLight} height={24} width={24} />
							<Text style={destinationItemStyles.destinationName}>{item.name}</Text>
						</View>
					</View>

					{isLoadingParks && <Text style={{ color: colors.primaryLight, paddingVertical: 8 }}>Loading parks...</Text>}
					{errorLoadingParks && <Text style={{ color: colors.highWaitingtime, paddingVertical: 8 }}>{errorLoadingParks}</Text>}

					{!isLoadingParks && !errorLoadingParks && childParks.length > 0 && (
						<VStack style={destinationParkChildrenStyles.parkChildListContainer}>
							{childParks.map((park) => (
								// This renders each park as a pressable item.
								// You might want to extract this into a <ParkItem /> component.
								<Pressable
									key={park.id}
									style={destinationParkChildrenStyles.parkChildContainer}
									android_ripple={{ color: `${colors.primary}86`, foreground: true }}
									onPress={() => {
										console.log("Child Park pressed:", park.name);
										// navigation.navigate("Park", { id: park.id, name: park.name }); // Remove
										router.push({ pathname: "/park/[id]", params: { id: park.id, name: park.name } }); // Add
									}}
								>
									<View style={destinationParkChildrenStyles.parkChildNameContainer}>
										<Icon name="park" fill={colors.primaryVeryLight} height={18} width={18} />
										<Text style={[destinationParkChildrenStyles.parkChildName, { fontSize: 18 }]}>{park.name_override || park.name}</Text>
									</View>
									<Icon name="chevronRight" fill={colors.primaryVeryLight} height={24} width={24} />
								</Pressable>
							))}
						</VStack>
					)}
					{!isLoadingParks && !errorLoadingParks && childParks.length === 0 && item.entity_type === "destination_group" && <Text style={{ color: colors.secondaryLight, paddingVertical: 8 }}>No individual parks listed under this group.</Text>}
				</VStack>
			</View>
		);
	} else {
		// This is a 'park' type display
		return (
			<View style={destinationItemStyles.destinationItemContainer}>
				<VStack style={destinationItemStyles.destinationItemContainerInner}>
					<HStack style={{ flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.primaryVeryDark }}>
						<View style={destinationItemStyles.destinationItemMetadata}>
							<StatusBadge status={isOpen} />
							<CountryBadge country={country} />
						</View>
						{!isPinned ? (
							<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={() => onTogglePin(item.entity_id)}>
								<View style={{ padding: 4, borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 4, overflow: "hidden" }}>
									<Icon name="mapPin" fill={colors.primaryLight} height={16} width={16} />
								</View>
							</Pressable>
						) : (
							<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={() => onTogglePin(item.entity_id)}>
								<View style={{ padding: 4, borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.primaryLight, borderRadius: 4, overflow: "hidden" }}>
									<Icon name="mapPin" fill={colors.primaryVeryDark} height={16} width={16} />
								</View>
							</Pressable>
						)}
					</HStack>
					<Pressable
						style={destinationItemStyles.destinationTitleContainerPark}
						android_ripple={{ color: colors.primaryTransparent, foreground: true }}
						onPress={() => {
							console.log("Park destination pressed:", item.name);
							// navigation.navigate("Park", { id: item.entity_id, name: item.name }); // Remove
							router.push({ pathname: "/park/[id]", params: { id: item.entity_id, name: item.name } }); // Add
						}}
					>
						<View style={destinationItemStyles.destinationNameContainer}>
							<Icon name="park" fill={colors.primaryVeryLight} height={24} width={24} />
							<Text style={destinationItemStyles.destinationName}>{item.name}</Text>
						</View>
						<Icon name="chevronRight" fill={colors.primaryVeryLight} height={24} width={24} />
					</Pressable>
				</VStack>
			</View>
		);
	}
}

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
