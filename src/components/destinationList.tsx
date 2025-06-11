import React, { useState, useEffect } from "react";

import { supabase } from "@src/utils/supabase";

import type { Tables } from "@src/types/database.types";

import { FlatList, ScrollView, View, SectionList } from "react-native";
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

export function DestinationList() {
	const [fetchedEntities, setFetchedEntities] = useState<DisplayableEntity[]>([]);
	const [processedEntities, setProcessedEntities] = useState<DisplayableEntityWithPinnedStatus[]>([]);
	const [pinnedIds, setPinnedIds] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadInitialData = async () => {
			try {
				setIsLoading(true);
				const [fetched, storedPinnedIds] = await Promise.all([fetchDisplayableEntities(), getPinnedDestinationIds()]);
				setFetchedEntities(fetched);
				setPinnedIds(storedPinnedIds);
				setError(null);
			} catch (e) {
				console.error("Failed to load initial data:", e);
				setError("Failed to load destinations.");
				setFetchedEntities([]);
				setPinnedIds([]);
			} finally {
				setIsLoading(false);
			}
		};

		loadInitialData();
	}, []);

	useEffect(() => {
		// Process and sort entities whenever fetchedEntities or pinnedIds change
		if (fetchedEntities.length > 0 || pinnedIds.length >= 0) {
			// Also run if fetchedEntities is empty to show "No destinations"
			const entitiesWithPinnedStatus: DisplayableEntityWithPinnedStatus[] = fetchedEntities.map((entity) => ({
				...entity,
				isPinned: pinnedIds.includes(entity.entity_id),
			}));

			entitiesWithPinnedStatus.sort((a, b) => {
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				return a.name.localeCompare(b.name);
			});
			setProcessedEntities(entitiesWithPinnedStatus);
		} else {
			setProcessedEntities([]);
		}
	}, [fetchedEntities, pinnedIds]);

	const handleTogglePin = async (entityId: string) => {
		const isCurrentlyPinned = pinnedIds.includes(entityId);
		let updatedPinnedIds;
		if (isCurrentlyPinned) {
			updatedPinnedIds = await removePinnedDestinationId(entityId);
		} else {
			updatedPinnedIds = await addPinnedDestinationId(entityId);
		}
		setPinnedIds(updatedPinnedIds);
	};

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
		// Changed 'entities' to 'processedEntities'
		return <Text>No destinations found.</Text>;
	}

	const sectionsMap = processedEntities.reduce((acc, entity) => {
		// Titles are based on whether the entity is pinned or not
		const sectionTitle = entity.isPinned ? "Pinned Destinations" : "All Destinations";
		if (!acc[sectionTitle]) {
			acc[sectionTitle] = [];
		}
		// 'isPinned' is guaranteed to be set by the useEffect that prepares processedEntities
		acc[sectionTitle].push(entity);
		return acc;
	}, {} as Record<string, DisplayableEntityWithPinnedStatus[]>);

	const sectionListData = [];
	// Ensure "Pinned Destinations" section is added first if it exists
	if (sectionsMap["Pinned Destinations"] && sectionsMap["Pinned Destinations"].length > 0) {
		sectionListData.push({ title: "Pinned Destinations", data: sectionsMap["Pinned Destinations"] });
	}
	// Add "All Destinations" section if it exists
	if (sectionsMap["All Destinations"] && sectionsMap["All Destinations"].length > 0) {
		sectionListData.push({ title: "All Destinations", data: sectionsMap["All Destinations"] });
	}

	return (
		<>
			<SafeAreaView>
				{/* SectionList with pinned destinations and all destinations */}
				<SectionList
					sections={sectionListData}
					keyExtractor={(item) => item.entity_id}
					renderItem={({ item }) => <DestinationItem key={item.entity_id} item={item} isPinned={item.isPinned || false} onTogglePin={handleTogglePin} />}
					initialNumToRender={10}
					renderSectionHeader={({ section: { title } }) => {
						// Only render header for "Pinned Destinations"
						if (title === "Pinned Destinations") {
							return <Text style={{ fontFamily: "Bebas Neue Pro", fontWeight: 800, fontSize: 18, padding: 8, color: colors.primaryLight }}>{title}</Text>;
						} else if (title === "All Destinations" && sectionListData.length > 1) {
							return <View style={{ padding: 2, backgroundColor: colors.primary, marginBottom: 16 }}></View>;
						}
						return null; // No header for other sections
					}}
				/>
			</SafeAreaView>
		</>
	);
}
