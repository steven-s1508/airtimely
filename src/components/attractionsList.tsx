// React / React Native Imports
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { SectionList, View, StyleSheet, SectionListData } from "react-native";
// 3rd Party Imports
import { Text, Select, SelectBackdrop, SelectContent, SelectInput, SelectItem, SelectIcon, SelectPortal, SelectTrigger, SelectDragIndicatorWrapper, SelectDragIndicator, VStack } from "@/src/components/ui";
import { ChevronDown } from "lucide-react-native";
// Local Imports
import { ridesListStyles } from "@/src/styles";
import { AttractionItem } from "./attractionItem";
import { getPinnedAttractionIds } from "@/src/utils/pinAttractions";
import { colors } from "@/src/styles/styles";

interface RideListProps {
	rides: Ride[];
	waitTimeIcons: { [key: string]: any }; // Consider defining a more specific type
	styles: StyleSheet.NamedStyles<any>; // Or a more specific style type
}

// Augmented type to include pinned status
type ParkChildWithPinnedStatus = ParkChild & {
	isPinned?: boolean;
};

export function RideList({ rides, waitTimeIcons, styles, parkChildren, activeTab }: RideListProps) {
	const [pinnedIds, setPinnedIds] = useState<string[]>([]);

	// Load pinned attractions on component mount and refresh when pinned status changes
	useEffect(() => {
		const loadPinnedIds = async () => {
			const storedPinnedIds = await getPinnedAttractionIds();
			setPinnedIds(storedPinnedIds);
		};
		loadPinnedIds();

		// Set up an interval to refresh pinned status
		const interval = setInterval(loadPinnedIds, 1000);
		return () => clearInterval(interval);
	}, []);

	if (!rides || rides.length === 0) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
				<Text>No ride information available at the moment.</Text>
			</View>
		);
	}

	// Parks view select states
	const [parksViewSelect, setParksViewSelect] = useState<"By Country" | "Alphabetical">("By Country");
	// Parks view list options
	const parksViewOptions: Array<{ country: { title: "By Country" | "Alphabetical"; value: string } }> = [{ country: { title: "By Country", value: "country" } }, { country: { title: "Alphabetical", value: "alphabetical" } }];

	const renderItem = useCallback(({ item }: { item: ParkChildWithPinnedStatus }) => <AttractionItem id={item.id} name={item.name} waitTime={item.wait_time_minutes ?? undefined} singleRiderWaitTime={item.single_rider_wait_time_minutes ?? undefined} status={item.status || "Unknown"} />, []);

	// Memoize the renderSectionHeader function
	const renderSectionHeader = useCallback(({ section }: { section: SectionListData<ParkChildWithPinnedStatus> & { isPinnedSection?: boolean } }) => {
		if (section.isPinnedSection) {
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
					Pinned Attractions
				</Text>
			);
		}

		return (
			<Text
				style={{
					color: colors.primaryLight,
					fontSize: 16,
					fontWeight: "bold",
					backgroundColor: colors.primaryVeryDark,
					padding: 12,
					marginTop: 8,
					borderRadius: 6,
				}}
			>
				{section.title} ({section.data.length})
			</Text>
		);
	}, []);

	// Memoize key extractor
	const keyExtractor = useCallback((item: ParkChildWithPinnedStatus) => item.id, []);

	// Memoize separator components
	const ItemSeparator = useCallback(() => <View style={{ height: 8 }} />, []);
	const SectionSeparator = useCallback(() => <View style={{ height: 16 }} />, []);

	const renderContent = () => {
		if (!parkChildren) {
			return <Text style={{ color: colors.primaryLight, textAlign: "center", padding: 16 }}>No data available for this park.</Text>;
		}

		let items: ParkChild[] = [];
		switch (activeTab) {
			case "attractions":
				items = parkChildren.attractions || [];
				break;
			case "shows":
				items = parkChildren.shows || [];
				break;
			case "restaurants":
				items = parkChildren.restaurants || [];
				break;
			default:
				items = parkChildren.attractions || [];
		}

		if (items.length === 0) {
			return <Text style={{ color: colors.primaryLight, textAlign: "center", padding: 16 }}>No {activeTab} found for this park.</Text>;
		}

		// Add pinned status to items
		const itemsWithPinnedStatus: ParkChildWithPinnedStatus[] = items.map((item) => ({
			...item,
			isPinned: pinnedIds.includes(item.id),
		}));

		// Separate pinned and unpinned items
		const pinnedItems = itemsWithPinnedStatus.filter((item) => item.isPinned);
		const unpinnedItems = itemsWithPinnedStatus.filter((item) => !item.isPinned);

		// Helper function to create status-based sections
		const createStatusSections = (items: ParkChildWithPinnedStatus[], isPinnedSection: boolean = false) => {
			// Define status priority order
			const statusOrder: Record<string, number> = {
				open: 1,
				operating: 1,
				down: 2,
				closed: 3,
				refurbishment: 4,
			};

			// Group items by status and sort alphabetically within each group
			const groupedItems = items.reduce((acc, item) => {
				const status = item.status?.toLowerCase() || "unknown";
				const normalizedStatus = status === "operating" ? "open" : status;

				if (!acc[normalizedStatus]) {
					acc[normalizedStatus] = [];
				}
				acc[normalizedStatus].push(item);
				return acc;
			}, {} as Record<string, ParkChildWithPinnedStatus[]>);

			// Sort items within each group alphabetically
			Object.keys(groupedItems).forEach((status) => {
				groupedItems[status].sort((a, b) => a.name.localeCompare(b.name));
			});

			// Sort status groups by priority and create sections
			return Object.keys(groupedItems)
				.sort((a, b) => {
					const priorityA = statusOrder[a] || 999;
					const priorityB = statusOrder[b] || 999;
					return priorityA - priorityB;
				})
				.map((status) => ({
					title: status === "open" ? "Operating" : status.charAt(0).toUpperCase() + status.slice(1),
					data: groupedItems[status],
					status: status,
					isPinnedSection: isPinnedSection,
				}));
		};

		const sections = [];

		// Add pinned sections if there are pinned items
		if (pinnedItems.length > 0) {
			const pinnedSections = createStatusSections(pinnedItems, true);
			sections.push(...pinnedSections);
		}

		// Add regular sections
		const regularSections = createStatusSections(unpinnedItems, false);
		sections.push(...regularSections);

		return <SectionList sections={sections} renderItem={renderItem} renderSectionHeader={renderSectionHeader} keyExtractor={keyExtractor} stickySectionHeadersEnabled={false} contentContainerStyle={{ padding: 16, gap: 8 }} ItemSeparatorComponent={ItemSeparator} SectionSeparatorComponent={SectionSeparator} removeClippedSubviews={true} maxToRenderPerBatch={10} windowSize={10} getItemLayout={undefined} />;
	};

	return renderContent();
}
