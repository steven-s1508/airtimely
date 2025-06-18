import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";

import { supabase } from "@src/utils/supabase";

import type { Tables } from "@src/types/database.types";

import { FlatList, ScrollView, View, SectionList, RefreshControl } from "react-native";
import { DestinationItem, SkeletonDestinationItem } from "./destinationItem";
import { VStack, Text } from "./ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, destinationListStyles } from "@src/styles/styles";

import { getPinnedDestinationIds, addPinnedDestinationId, removePinnedDestinationId } from "@src/utils/pinDestinations";

// Define the type for items from the 'displayable_entities' view
// Ideally, you would regenerate your Supabase types to include this view.
// If not, you can define it manually like this:
export type DisplayableEntity = Tables<"displayable_destinations">;

// Augmented type to include pinned status
export type DisplayableEntityWithPinnedStatus = DisplayableEntity & {
	isPinned?: boolean;
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
	data.sort((a, b) => a.name.localeCompare(b.name));
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
		const [fetchedEntities, setFetchedEntities] = useState<DisplayableEntity[]>([]);
		const [pinnedIds, setPinnedIds] = useState<string[]>([]);
		const [isLoading, setIsLoading] = useState(true);
		const [refreshing, setRefreshing] = useState(false);
		const [error, setError] = useState<string | null>(null);
		const [refreshKey, setRefreshKey] = useState(0);

		useImperativeHandle(ref, () => ({
			refresh: async () => {
				await loadInitialData(true);
			},
		}));

		const loadInitialData = useCallback(async (isRefresh: boolean = false) => {
			try {
				if (isRefresh) {
					setRefreshing(true);
				} else {
					setIsLoading(true);
				}

				const [fetched, storedPinnedIds] = await Promise.all([fetchDisplayableEntities(), getPinnedDestinationIds()]);
				setFetchedEntities(fetched);
				setPinnedIds(storedPinnedIds);
				setError(null);
				setRefreshKey((prev) => prev + 1);
			} catch (e) {
				console.error("Failed to load initial data:", e);
				setError("Failed to load destinations.");
				setFetchedEntities([]);
				setPinnedIds([]);
			} finally {
				if (isRefresh) {
					setRefreshing(false);
				} else {
					setIsLoading(false);
				}
			}
		}, []);

		const handleRefresh = async () => {
			await loadInitialData(true);
		};

		useEffect(() => {
			loadInitialData();
		}, [loadInitialData]);

		// Memoize processed entities to prevent unnecessary recalculations
		const processedEntities = useMemo(() => {
			if (fetchedEntities.length === 0) return [];

			let entitiesWithPinnedStatus: DisplayableEntityWithPinnedStatus[] = fetchedEntities.map((entity) => ({
				...entity,
				isPinned: pinnedIds.includes(entity.entity_id),
			}));

			if (searchFilter.trim() !== "") {
				entitiesWithPinnedStatus = entitiesWithPinnedStatus.filter((entity) => entity.name.toLowerCase().includes(searchFilter.toLowerCase()));
			}

			entitiesWithPinnedStatus.sort((a, b) => {
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				return a.name.localeCompare(b.name);
			});

			return entitiesWithPinnedStatus;
		}, [fetchedEntities, pinnedIds, searchFilter]);

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
				const isCurrentlyPinned = pinnedIds.includes(entityId);
				let updatedPinnedIds;
				if (isCurrentlyPinned) {
					updatedPinnedIds = await removePinnedDestinationId(entityId);
				} else {
					updatedPinnedIds = await addPinnedDestinationId(entityId);
				}
				setPinnedIds(updatedPinnedIds);
			},
			[pinnedIds]
		);

		// Memoize render functions
		const renderItem = useCallback(({ item }: { item: DisplayableEntityWithPinnedStatus }) => <DestinationItem item={item} isPinned={item.isPinned || false} onTogglePin={handleTogglePin} />, [handleTogglePin]);

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
								color: colors.primaryLight,
							}}
						>
							{title}
						</Text>
					);
				} else if (title === "All Destinations" && sectionListData.length > 1) {
					return <View style={{ padding: 2, backgroundColor: colors.primary, marginBottom: 16 }}></View>;
				}
				return null; // No header for other sections
			},
			[sectionListData.length]
		);

		const keyExtractor = useCallback((item: DisplayableEntityWithPinnedStatus) => `${item.entity_id}-${refreshKey}`, [refreshKey]);

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
			return <Text>No destinations found.</Text>;
		}

		return (
			<View style={{ flex: 1 }}>
				<SectionList sections={sectionListData} keyExtractor={keyExtractor} renderItem={renderItem} renderSectionHeader={renderSectionHeader} ItemSeparatorComponent={ItemSeparator} SectionSeparatorComponent={SectionSeparator} initialNumToRender={6} maxToRenderPerBatch={4} windowSize={25} removeClippedSubviews={true} updateCellsBatchingPeriod={50} stickySectionHeadersEnabled={false} contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating destinations..." titleColor={colors.primaryLight} />} />
			</View>
		);
	})
);

DestinationList.displayName = "DestinationList";
