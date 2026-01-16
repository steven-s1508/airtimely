import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";

import { supabase } from "@src/utils/supabase";

import type { Tables } from "@src/types/supabase";

import { View, SectionList, RefreshControl } from "react-native";
import { DestinationItem, SkeletonDestinationItem } from "./destinationItem";
import { Text } from "./ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@src/styles/styles";

import { usePinnedItemsStore } from "@src/stores/pinnedItemsStore";
import { getCountryAliases } from "@src/utils/helpers/countryMapping";
import { useDestinations } from "@src/hooks/api/useDestinations";
import { useLiveStatuses } from "@src/hooks/api/useLiveStatuses";
import { useChildParks } from "@src/hooks/api/useChildParks";
import { type ParkStatus } from "@src/utils/api/getParkStatus";
import { useQueryClient } from "@tanstack/react-query";

// Define the type for items from the 'displayable_entities' view
// Ideally, you would regenerate your Supabase types to include this view.
// If not, you can define it manually like this:
export type DisplayableEntity = Tables<"displayable_destinations">;

// Augmented type to include pinned status and current status
export type DisplayableEntityWithPinnedStatus = DisplayableEntity & {
	isPinned?: boolean;
	currentStatus?: ParkStatus;
};

/**
 * Fetch a list of displayable entities (parks that are destinations or destination groups).
 * This function is used to fetch the list of items
 * to be displayed in the DestinationList component.
 * @returns {Promise<DisplayableEntity[]>} A promise that resolves to an array of displayable entities.
 */
export async function fetchDisplayableEntities(): Promise<DisplayableEntity[]> {
	const { data, error } = await supabase.from("displayable_destinations") // Query the new view
		.select(`
            entity_id,
            name,
            entity_type,
            country_code,
            original_destination_id
        `);

	if (error) {
		console.error("Error fetching displayable entities:", error);
		return [];
	}

	// Sort the data by name in ascending order
	data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
	// Ensure the data is in the expected format
	if (!Array.isArray(data)) {
		console.error("Fetched data is not an array:", data);
		return [];
	}
	return data as DisplayableEntity[]; // Cast to your defined type
}

export interface DestinationListRef {
	refresh: () => Promise<void>;
}

export const DestinationList = React.memo(
	forwardRef<DestinationListRef, { searchFilter?: string }>(({ searchFilter = "" }, ref) => {
		const queryClient = useQueryClient();
		const { data: fetched = [], isLoading: isLoadingDestinations, isError: isErrorDestinations } = useDestinations();

		// 1. Identify destination groups to fetch their child parks
		const groupIds = useMemo(() => {
			return fetched
				.filter((e) => e.entity_type === "destination_group")
				.map((e) => e.original_destination_id!)
				.filter(Boolean);
		}, [fetched]);

		const { data: allChildParks = [], isLoading: isLoadingChildParks } = useChildParks(groupIds);

		// 2. Collect all park IDs that need status
		const allParkIds = useMemo(() => {
			const ids = new Set<string>();
			fetched.filter((e) => e.entity_type === "park").forEach((e) => ids.add(e.entity_id!));
			allChildParks.forEach((p) => ids.add(p.id));
			return Array.from(ids);
		}, [fetched, allChildParks]);

		const { data: statusesMap = {}, isLoading: isLoadingStatuses } = useLiveStatuses(allParkIds);

		const [refreshing, setRefreshing] = useState(false);
		const [refreshKey, setRefreshKey] = useState(0);
		const { pinnedDestinations } = usePinnedItemsStore();

		const handleRefresh = useCallback(async () => {
			setRefreshKey((prev) => prev + 1);
			setRefreshing(true);
			// Invalidate all relevant queries to trigger background revalidation
			await queryClient.invalidateQueries({ queryKey: ["destinations"] });
			await queryClient.invalidateQueries({ queryKey: ["childParks"] });
			await queryClient.invalidateQueries({ queryKey: ["liveStatuses"] });
			setRefreshing(false);
		}, [queryClient]);

		useImperativeHandle(ref, () => ({
			refresh: handleRefresh,
		}));

		// Map statuses back to entities
		const fetchedEntities = useMemo(() => {
			return fetched.map((entity) => {
				let status: ParkStatus = "Unknown";
				if (entity.entity_type === "park") {
					status = statusesMap[entity.entity_id!] || "Unknown";
				} else if (entity.entity_type === "destination_group") {
					const childParksForGroup = allChildParks.filter((p) => p.destination_id === entity.original_destination_id);
					if (childParksForGroup.length === 0) {
						status = "Unknown";
					} else {
						const childStatuses = childParksForGroup.map((p) => statusesMap[p.id] || "Unknown");
						if (childStatuses.includes("Open")) {
							status = "Open";
						} else if (childStatuses.every((s) => s === "Closed")) {
							status = "Closed";
						} else {
							status = "Unknown";
						}
					}
				}
				return { ...entity, currentStatus: status };
			});
		}, [fetched, statusesMap, allChildParks]);

		const isLoading = isLoadingDestinations || (groupIds.length > 0 && isLoadingChildParks) || (allParkIds.length > 0 && isLoadingStatuses);
		const error = isErrorDestinations ? "Failed to load destinations." : null;

		// Memoize processed entities to prevent unnecessary recalculations
		const processedEntities = useMemo(() => {
			if (fetchedEntities.length === 0) return [];

			let entitiesWithPinnedStatus: DisplayableEntityWithPinnedStatus[] = fetchedEntities.map((entity) => ({
				...entity,
				isPinned: pinnedDestinations.includes(entity.entity_id!),
			}));

			if (searchFilter.trim() !== "") {
				const lowerFilter = searchFilter.toLowerCase();
				entitiesWithPinnedStatus = entitiesWithPinnedStatus.filter((entity) => {
					const nameMatch = entity.name && entity.name.toLowerCase().includes(lowerFilter);
					const countryCodeMatch = entity.country_code && entity.country_code.toLowerCase().includes(lowerFilter);
					const aliases = getCountryAliases(entity.country_code);
					const countryAliasMatch = aliases.some((alias) => alias.toLowerCase().includes(lowerFilter));
					const statusMatch = entity.currentStatus && entity.currentStatus.toLowerCase().includes(lowerFilter);

					return nameMatch || countryCodeMatch || countryAliasMatch || statusMatch;
				});
			}

			entitiesWithPinnedStatus.sort((a, b) => {
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				return (a.name || "").localeCompare(b.name || "");
			});

			return entitiesWithPinnedStatus;
		}, [fetchedEntities, pinnedDestinations, searchFilter]);

		// Memoize section list data
		const sectionListData = useMemo(() => {
			const sectionsMap = processedEntities.reduce((acc, entity) => {
				const sectionTitle = entity.isPinned ? "Pinned Destinations" : "All Destinations";
				if (!acc[sectionTitle]) {
					acc[sectionTitle] = [];
				}
				acc[sectionTitle].push(entity);
				return acc;
			}, {} as Record<string, DisplayableEntityWithPinnedStatus[]>);

			const sections = [];
			// Ensure "Pinned Destinations" section is added first if it exists
			if (sectionsMap["Pinned Destinations"] && sectionsMap["Pinned Destinations"].length > 0) {
				sections.push({ title: "Pinned Destinations", data: sectionsMap["Pinned Destinations"] });
			}
			// Add "All Destinations" section if it exists
			if (sectionsMap["All Destinations"] && sectionsMap["All Destinations"].length > 0) {
				sections.push({ title: "All Destinations", data: sectionsMap["All Destinations"] });
			}

			return sections;
		}, [processedEntities]);

		const handleTogglePin = useCallback(
			async (entityId: string) => {
				const isCurrentlyPinned = pinnedDestinations.includes(entityId);
				if (isCurrentlyPinned) {
					usePinnedItemsStore.getState().removePinnedDestination(entityId);
				} else {
					usePinnedItemsStore.getState().addPinnedDestination(entityId);
				}
			},
			[pinnedDestinations]
		);

		// Memoize render functions
		const renderItem = useCallback(({ item }: { item: DisplayableEntityWithPinnedStatus }) => <DestinationItem item={item} isPinned={item.isPinned || false} onTogglePin={handleTogglePin} refreshKey={refreshKey} />, [handleTogglePin, refreshKey]);

		const renderSectionHeader = useCallback(
			({ section: { title } }: { section: { title: string } }) => {
				// Only render header for "Pinned Destinations"
				if (title === "Pinned Destinations") {
					return (
						<Text
							style={{
								fontFamily: "Bebas Neue Pro",
								fontWeight: 800,
								fontSize: 18,
								padding: 8,
								paddingTop: 0,
								color: colors.text.primary,
							}}
						>
							{title}
						</Text>
					);
				} else if (title === "All Destinations" && sectionListData.length > 1) {
					return <View style={{ padding: 2, backgroundColor: colors.ui.border, marginBottom: 16 }}></View>;
				}
				return null; // No header for other sections
			},
			[sectionListData.length]
		);

		const keyExtractor = useCallback((item: DisplayableEntityWithPinnedStatus) => item.entity_id ?? "unknown", []);

		const ItemSeparator = useCallback(() => <View style={{ height: 0 }} />, []);
		const SectionSeparator = useCallback(() => <View style={{ height: 8 }} />, []);

		if (isLoading) {
			return (
				<SafeAreaView style={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
					<SkeletonDestinationItem />
					<SkeletonDestinationItem />
					<SkeletonDestinationItem />
					<SkeletonDestinationItem />
					<SkeletonDestinationItem />
					<SkeletonDestinationItem />
				</SafeAreaView>
			);
		}

		if (error) {
			return <Text>Error: {error}</Text>;
		}

		if (!processedEntities || processedEntities.length === 0) {
			return <Text style={{ color: colors.text.primary, textAlign: "center", marginTop: 20 }}>No destinations found.</Text>;
		}

		return (
			<View style={{ flex: 1 }}>
				<SectionList
					sections={sectionListData}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					renderSectionHeader={renderSectionHeader}
					ItemSeparatorComponent={ItemSeparator}
					SectionSeparatorComponent={SectionSeparator}
					initialNumToRender={6}
					maxToRenderPerBatch={4}
					windowSize={25}
					removeClippedSubviews={true}
					updateCellsBatchingPeriod={50}
					stickySectionHeadersEnabled={false}
					contentContainerStyle={{ flexGrow: 1 }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating destinations..." titleColor={colors.primaryLight} />}
					maintainVisibleContentPosition={{
						minIndexForVisible: 1,
						autoscrollToTopThreshold: undefined,
					}}
				/>
			</View>
		);
	})
);

DestinationList.displayName = "DestinationList";
