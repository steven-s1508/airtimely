// React / React Native Imports
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, SectionList, SectionListData, RefreshControl } from "react-native";
// Expo Imports
import { useLocalSearchParams } from "expo-router";
// 3rd Party Imports
import { Text, VStack, HStack, Pressable } from "@/src/components/ui";
// Local Imports
import { ParkHeader } from "@/src/components/parkHeader";
import { Icon } from "@/src/components/Icon";
import { colors, parkScreenStyles } from "@/src/styles/styles";
import { AttractionItem } from "@/src/components/attractionItem";
import { getParkChildren, ParkChild, ParkChildrenResponse } from "@/app/api/get/getParkChildren";

export default function ParkScreen() {
	const params = useLocalSearchParams<{ id: string; name: string; country_code: string; status: string }>();
	const { id, name, country_code, status } = params;
	const [parkChildren, setParkChildren] = useState<ParkChildrenResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<"attractions" | "shows" | "restaurants">("attractions");

	useEffect(() => {
		if (id) {
			loadParkChildren();
		}
	}, [id]);

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
		switch (activeTab) {
			case "attractions":
				items = parkChildren.attractions;
				break;
			case "shows":
				items = parkChildren.shows;
				break;
			case "restaurants":
				items = parkChildren.restaurants;
				break;
		}

		if (items.length === 0) {
			return <Text style={{ color: colors.primaryLight, textAlign: "center", padding: 16 }}>No {activeTab} found for this park.</Text>;
		}

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
		}, {} as Record<string, ParkChild[]>);

		// Sort items within each group alphabetically
		Object.keys(groupedItems).forEach((status) => {
			groupedItems[status].sort((a, b) => a.name.localeCompare(b.name));
		});

		// Sort status groups by priority and create sections
		const sections = Object.keys(groupedItems)
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

		const renderSectionHeader = ({ section }: { section: SectionListData<ParkChild> }) => (
			<Text
				style={{
					color: colors.primaryLight,
					fontSize: 16,
					fontWeight: "bold",
					backgroundColor: colors.primaryBlack,
					padding: 12,
					borderRadius: 6,
					borderWidth: 1,
					borderColor: colors.primaryDark,
				}}
			>
				{section.title} ({section.data.length})
			</Text>
		);

		const renderItem = ({ item }: { item: ParkChild }) => <AttractionItem key={`${item.id}-${refreshing ? "refreshed" : "initial"}`} id={item.id} name={item.name} waitTime={item.wait_time_minutes ?? undefined} singleRiderWaitTime={item.single_rider_wait_time_minutes ?? undefined} status={item.status || "Unknown"} />;

		return <SectionList sections={sections} renderItem={renderItem} /* renderSectionHeader={renderSectionHeader} */ keyExtractor={(item) => `${item.id}-${refreshing ? "refreshed" : "initial"}`} stickySectionHeadersEnabled={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} /* SectionSeparatorComponent={() => <View style={{ height: 16 }} />} */ refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primaryLight, colors.primaryVeryLight]} progressBackgroundColor={colors.primaryDark} tintColor={colors.primaryVeryLight} title="Updating wait times..." titleColor={colors.primaryLight} />} />;
	};

	return (
		<View style={parkScreenStyles.parkScreenContainer}>
			<ParkHeader item={{ id, name, country_code, status }} onRefresh={handleRefresh} isRefreshing={refreshing} />
			<VStack style={{ gap: 16, padding: 16 }}>
				{/* Tab Bar */}
				<HStack style={{ flexDirection: "row" }}>
					<Pressable android_ripple={{ color: colors.primaryTransparent }} onPress={() => setActiveTab("attractions")} style={{ flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
						<Icon name="attraction" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight }}>Attractions</Text>
						{activeTab === "attractions" && <View style={{ width: 32, height: 4, backgroundColor: colors.primaryLight, borderRadius: 4 }} />}
					</Pressable>
					<Pressable android_ripple={{ color: colors.primaryTransparent }} onPress={() => setActiveTab("shows")} style={{ flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
						<Icon name="show" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight }}>Shows</Text>
						{activeTab === "shows" && <View style={{ width: 32, height: 4, backgroundColor: colors.primaryLight, borderRadius: 4 }} />}
					</Pressable>
					<Pressable android_ripple={{ color: colors.primaryTransparent }} onPress={() => setActiveTab("restaurants")} style={{ flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
						<Icon name="restaurant" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight }}>Restaurants</Text>
						{activeTab === "restaurants" && <View style={{ width: 32, height: 4, backgroundColor: colors.primaryLight, borderRadius: 4 }} />}
					</Pressable>
				</HStack>
			</VStack>

			{/* Content */}
			<View style={{ flex: 1 }}>{renderContent()}</View>
		</View>
	);
}
