// React / React Native Imports
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, SectionList, SectionListData, RefreshControl } from "react-native";
// Expo Imports
import { useLocalSearchParams } from "expo-router";
// 3rd Party Imports
import { Input, InputField, InputSlot, Text } from "@/src/components/ui";
// Local Imports
import { ParkHeader } from "@/src/components/parkHeader";
import { Icon } from "@/src/components/Icon";
import { colors, styles, parkScreenStyles } from "@/src/styles/styles";
import { AttractionItem } from "@/src/components/attractionItem";
import { ShowItem } from "@/src/components/showItem";
import { getParkChildren, ParkChild, ParkChildrenResponse } from "@/src/utils/api/getParkChildren";
import { getPinnedAttractionIds } from "@/src/utils/pinAttractions";
import { getPinnedShowIds } from "@/src/utils/pinShows";

interface ParkChildWithPinnedStatus extends ParkChild {
	isPinned: boolean;
}

export default function ParkScreen() {
	const [attractionFilterInput, setAttractionFilterInput] = useState(""); // Actual input value
	const [debouncedAttractionFilter, setDebouncedAttractionFilter] = useState(""); // Debounced value for filtering - not used in snippet
	const params = useLocalSearchParams<{ id: string; name: string; country_code: string; status: string }>();
	const { id, name, country_code, status } = params;
	const [parkChildren, setParkChildren] = useState<ParkChildrenResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<"attractions" | "shows" | "restaurants">("attractions");
	const [pinnedAttractionIds, setPinnedAttractionIds] = useState<string[]>([]);
	const [pinnedShowIds, setPinnedShowIds] = useState<string[]>([]);

	useEffect(() => {
		if (id) {
			loadParkChildren();
		}
	}, [id]);

	// Load pinned attractions and shows
	useEffect(() => {
		const loadPinnedIds = async () => {
			const storedPinnedAttractionIds = await getPinnedAttractionIds();
			const storedPinnedShowIds = await getPinnedShowIds();
			setPinnedAttractionIds(storedPinnedAttractionIds);
			setPinnedShowIds(storedPinnedShowIds);
		};
		loadPinnedIds();

		// Set up an interval to refresh pinned status
		const interval = setInterval(loadPinnedIds, 1000);
		return () => clearInterval(interval);
	}, []);

	const loadParkChildren = async (isRefresh: boolean = false) => {
		if (isRefresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}

		try {
			const children = await getParkChildren(id);
			setParkChildren(children);
		} catch (error) {
			console.error("Error loading park children:", error);
		} finally {
			if (isRefresh) {
				setRefreshing(false);
			} else {
				setLoading(false);
			}
		}
	};

	// Debounce the search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedAttractionFilter(attractionFilterInput);
		}, 300); // 300ms delay

		return () => clearTimeout(timer);
	}, [attractionFilterInput]);

	const handleRefresh = async () => {
		await loadParkChildren(true);
	};

	if (!id || !name) {
		return <ActivityIndicator />;
	}

	if (loading) {
		return (
			<View style={parkScreenStyles.parkScreenContainer}>
				<ParkHeader item={{ id, name, country_code }} onRefresh={handleRefresh} isRefreshing={refreshing} />
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
					<ActivityIndicator size="large" color={colors.primaryLight} />
					<Text style={{ color: colors.primaryLight, marginTop: 16 }}>Loading park data...</Text>
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
		currentPinnedIds = pinnedAttractionIds;
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
			itemsWithPinnedStatus = itemsWithPinnedStatus.filter((item) => item.name.toLowerCase().includes(debouncedAttractionFilter.toLowerCase()));
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
			if (activeTab === "shows") {
				return <ShowItem key={`${item.id}-${refreshing ? "refreshed" : "initial"}`} id={item.id} name={item.name} />;
			} else {
				return (
					<AttractionItem
						key={`${item.id}-${refreshing ? "refreshed" : "initial"}`}
						id={item.id}
						name={item.name}
						waitTime={item.wait_time_minutes ?? undefined}
						singleRiderWaitTime={item.single_rider_wait_time_minutes ?? undefined}
						status={item.status || "Unknown"}
						hasVirtualQueue={false} // You can add this field to your data if needed
					/>
				);
			}
		};

		const renderSectionHeader = ({ section }: { section: SectionListData<ParkChildWithPinnedStatus> & { isPinnedSection?: boolean } }) => {
			if (section.isPinnedSection) {
				const sectionTitle = activeTab === "shows" ? "Pinned Shows" : activeTab === "restaurants" ? "Pinned Restaurants" : "Pinned Attractions";

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
						{sectionTitle}
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
		};

		return <SectionList sections={sections} renderItem={renderItem} renderSectionHeader={renderSectionHeader} keyExtractor={(item) => `${item.id}-${refreshing ? "refreshed" : "initial"}`} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating wait times..." titleColor={colors.primaryLight} />} />;
	};

	return (
		<View style={parkScreenStyles.parkScreenContainer}>
			<ParkHeader item={{ id, name, country_code }} onRefresh={handleRefresh} isRefreshing={refreshing} />
			{/* Search and Refresh Container */}
			<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
				{/* Search Input */}
				<Input style={[styles.attractionFilterInput, { flex: 1 }]}>
					<InputField placeholder="Search for attraction..." placeholderTextColor={colors.primaryLight} value={attractionFilterInput} onChangeText={setAttractionFilterInput} style={styles.attractionFilterInputField} />
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
