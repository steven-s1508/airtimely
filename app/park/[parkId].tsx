// React / React Native Imports
import React, { useState, useEffect, useMemo } from "react";
import { View, ActivityIndicator, SectionList, SectionListData, RefreshControl } from "react-native";
// Expo Imports
import { useLocalSearchParams } from "expo-router";
// 3rd Party Imports
import { Input, InputField, InputSlot, Text, HStack } from "@/src/components/ui";
import { DateTime } from "luxon";
// Local Imports
import { ParkHeader } from "@/src/components/parkHeader";
import { Icon } from "@/src/components/Icon";
import { colors, styles, parkScreenStyles, base } from "@/src/styles/styles";
import { AttractionItem } from "@/src/components/attractionItem";
import { SkeletonAttractionItem } from "@/src/components/skeletons/skeletonAttractionItem";
import { ParkChild } from "@/src/utils/api/getParkChildren";
import { usePinnedItemsStore } from "@/src/stores/pinnedItemsStore";
import { useParkChildren } from "@/src/hooks/api/useParkChildren";
import { isValidUUID } from "@/src/utils/helpers/validation";
import { useQueryClient } from "@tanstack/react-query";

interface ParkChildWithPinnedStatus extends ParkChild {
	isPinned: boolean;
}

export default function ParkScreen() {
	const queryClient = useQueryClient();
	const [attractionFilterInput, setAttractionFilterInput] = useState(""); // Actual input value
	const [debouncedAttractionFilter, setDebouncedAttractionFilter] = useState(""); // Debounced value for filtering - not used in snippet
	const [isManualRefreshing, setIsManualRefreshing] = useState(false); // Track manual pull-to-refresh
	const params = useLocalSearchParams<{ id: string; name: string; country_code: string; status: string }>();
	const { id, name, country_code, status } = params;
	
	const { data: parkChildren, isLoading: loading, isRefetching: refreshing, refetch: loadParkChildren, dataUpdatedAt } = useParkChildren(id!);
	
	// Format the last updated time
	const lastUpdatedText = useMemo(() => {
		if (!dataUpdatedAt) return null;
		return DateTime.fromMillis(dataUpdatedAt).toFormat("h:mm a");
	}, [dataUpdatedAt]);

	// Validate park ID is a valid UUID
	if (!id || !isValidUUID(id)) {
		console.error(`Invalid park ID: ${id}`);
		return <ActivityIndicator />;
	}

	// Use Zustand store for pinned items
	const { pinnedAttractions } = usePinnedItemsStore();

	// Debounce the search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedAttractionFilter(attractionFilterInput);
		}, 300); // 300ms delay

		return () => clearTimeout(timer);
	}, [attractionFilterInput]);

	const handleRefresh = async () => {
		setIsManualRefreshing(true);
		await queryClient.invalidateQueries({ queryKey: ["parkChildren", id] });
		setIsManualRefreshing(false);
	};

	if (!id || !name) {
		return <ActivityIndicator />;
	}

	if (loading && !parkChildren) {
		return (
			<View style={parkScreenStyles.parkScreenContainer}>
				<ParkHeader item={{ id, name, country_code }} onRefresh={handleRefresh} isRefreshing={refreshing} />
				<View style={{ flex: 1, paddingHorizontal: 16, gap: 8 }}>
					<SkeletonAttractionItem />
					<SkeletonAttractionItem />
					<SkeletonAttractionItem />
					<SkeletonAttractionItem />
					<SkeletonAttractionItem />
				</View>
			</View>
		);
	}

	const renderContent = () => {
		if (!parkChildren) {
			return <Text style={{ color: colors.primaryLight, textAlign: "center", padding: 16 }}>No data available for this park.</Text>;
		}

		let items: ParkChild[] = [];
		let currentPinnedIds: string[] = [];

		items = parkChildren.attractions;
		currentPinnedIds = pinnedAttractions;
		if (items.length === 0) {
			return <Text style={{ color: colors.primaryLight, textAlign: "center", padding: 16 }}>No attractions found for this park.</Text>;
		}

		// Add pinned status to items
		let itemsWithPinnedStatus: ParkChildWithPinnedStatus[] = items.map((item) => ({
			...item,
			isPinned: currentPinnedIds.includes(item.id),
		}));

		// Apply search filter
		if (debouncedAttractionFilter.trim() !== "") {
			const lowerFilter = debouncedAttractionFilter.toLowerCase();
			itemsWithPinnedStatus = itemsWithPinnedStatus.filter((item) => {
				const nameMatch = item.name.toLowerCase().includes(lowerFilter);
				const statusMatch = item.status && item.status.toLowerCase().includes(lowerFilter);
				// Also handle "operating" as "open" for search consistency
				const operatingMatch = lowerFilter === "open" && item.status?.toLowerCase() === "operating";

				return nameMatch || statusMatch || operatingMatch;
			});
		}

		// If no results after filtering, show message
		if (itemsWithPinnedStatus.length === 0) {
			return <Text style={{ color: colors.primaryLight, textAlign: "center", padding: 16 }}>No attractions found matching "{debouncedAttractionFilter}".</Text>;
		}

		// Separate pinned and unpinned items
		const pinnedItems = itemsWithPinnedStatus.filter((item) => item.isPinned);
		const unpinnedItems = itemsWithPinnedStatus.filter((item) => !item.isPinned);

		// Helper function to create status-based sections
		const createStatusSections = (items: ParkChildWithPinnedStatus[]) => {
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

				// Skip items with "No_data" status
				if (normalizedStatus === "no_data") {
					return acc;
				}

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
				}));
		};

		const sortPinnedItemsByStatus = (items: ParkChildWithPinnedStatus[]) => {
			const statusOrder: Record<string, number> = {
				open: 1,
				operating: 1,
				down: 2,
				closed: 3,
				refurbishment: 4,
			};

			return items
				.filter((item) => {
					const status = item.status?.toLowerCase() || "unknown";
					const normalizedStatus = status === "operating" ? "open" : status;
					return normalizedStatus !== "no_data";
				})
				.sort((a, b) => {
					const statusA = a.status?.toLowerCase() || "unknown";
					const statusB = b.status?.toLowerCase() || "unknown";
					const normalizedStatusA = statusA === "operating" ? "open" : statusA;
					const normalizedStatusB = statusB === "operating" ? "open" : statusB;

					const priorityA = statusOrder[normalizedStatusA] || 999;
					const priorityB = statusOrder[normalizedStatusB] || 999;

					// First sort by status priority
					if (priorityA !== priorityB) {
						return priorityA - priorityB;
					}

					// Then sort alphabetically within same status
					return a.name.localeCompare(b.name);
				});
		};

		const sections = [];

		// Add pinned sections if there are pinned items
		if (pinnedItems.length > 0) {
			const sortedPinnedItems = sortPinnedItemsByStatus(pinnedItems);
			sections.push({
				title: "",
				data: sortedPinnedItems,
				isPinnedSection: true,
			});
		}

		// Add regular sections
		const regularSections = createStatusSections(unpinnedItems);
		sections.push(...regularSections);

		const renderItem = ({ item }: { item: ParkChildWithPinnedStatus }) => {
			return (
				<AttractionItem
					key={`${item.id}-${refreshing ? "refreshed" : "initial"}`}
					id={item.id}
					parkId={id}
					name={item.name}
					waitTime={item.wait_time_minutes ?? undefined}
					singleRiderWaitTime={item.single_rider_wait_time_minutes ?? undefined}
					status={item.status || "Unknown"}
					hasVirtualQueue={false} // You can add this field to your data if needed
				/>
			);
		};

		const renderSectionHeader = ({ section }: { section: SectionListData<ParkChildWithPinnedStatus> & { isPinnedSection?: boolean } }) => {
			if (section.isPinnedSection) {
				const sectionTitle = "Pinned Attractions";

				return (
					<Text
						style={{
							fontFamily: "Bebas Neue Pro",
							fontWeight: 800,
							fontSize: 14,
							paddingVertical: 8,
							paddingHorizontal: 10,
							paddingTop: 0,
							color: colors.primaryLight,
						}}
					>
						{sectionTitle}
					</Text>
				);
			}

			return (
				<Text
					style={{
						color: section.title.toLowerCase() === "open" ? base.primary[900] : section.title.toLowerCase() === "down" ? base.error[900] : section.title.toLowerCase() === "closed" ? base.secondary[900] : section.title.toLowerCase() === "refurbishment" ? base.accent[900] : base.primary[900],
						fontSize: 14,
						fontWeight: "bold",
						backgroundColor: section.title.toLowerCase() === "open" ? base.primary[300] : section.title.toLowerCase() === "down" ? base.error[200] : section.title.toLowerCase() === "closed" ? base.secondary[300] : section.title.toLowerCase() === "refurbishment" ? base.accent[300] : base.primary[300],
						paddingVertical: 8,
						paddingHorizontal: 10,
						marginTop: 8,
						borderRadius: 6,
					}}
				>
					{section.title} ({section.data.length})
				</Text>
			);
		};

		return <SectionList sections={sections} renderItem={renderItem} renderSectionHeader={renderSectionHeader} keyExtractor={(item) => `${item.id}-${refreshing ? "refreshed" : "initial"}`} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating wait times..." titleColor={colors.primaryLight} />} />;
	};

	return (
		<View style={parkScreenStyles.parkScreenContainer}>
			<ParkHeader item={{ id, name, country_code }} onRefresh={handleRefresh} isRefreshing={refreshing} lastUpdatedText={lastUpdatedText} />
			{/* Search and Last Updated Container */}
			<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
				{/* Search Input */}
				<Input style={[styles.attractionFilterInput, { flex: 1 }]}>
					<InputField placeholder="Search by attraction or status..." placeholderTextColor={colors.primaryLight} value={attractionFilterInput} onChangeText={setAttractionFilterInput} style={styles.attractionFilterInputField} />
					{attractionFilterInput.length > 0 && (
						<InputSlot onPress={() => setAttractionFilterInput("")} style={styles.clearButton} hitSlop={10}>
							<Icon name="close" fill={colors.primaryVeryLight} height={24} width={24} />
						</InputSlot>
					)}
				</Input>
			</View>

			{/* Content */}
			<View style={{ flex: 1 }}>{renderContent()}</View>
		</View>
	);
}
