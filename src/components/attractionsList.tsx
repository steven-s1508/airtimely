// React / React Native Imports
import React, { useState, useCallback } from "react";
import { SectionList, View, StyleSheet, SectionListData } from "react-native";
// 3rd Party Imports
import { Text, Select, SelectBackdrop, SelectContent, SelectInput, SelectItem, SelectIcon, SelectPortal, SelectTrigger, SelectDragIndicatorWrapper, SelectDragIndicator, VStack } from "@/src/components/ui";
import { ChevronDown } from "lucide-react-native";
// Local Imports
import { ridesListStyles } from "@/src/styles";
import { AttractionItem } from "./attractionItem";

//Testing
import { Image } from "expo-image";

interface RideListProps {
	rides: Ride[];
	waitTimeIcons: { [key: string]: any }; // Consider defining a more specific type
	styles: StyleSheet.NamedStyles<any>; // Or a more specific style type
}

export function RideList({ rides, waitTimeIcons, styles }: RideListProps) {
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

    const renderItem = useCallback(({ item }: { item: ParkChild }) => (
        <AttractionItem
            id={item.id}
            name={item.name}
            waitTime={item.wait_time_minutes ?? undefined}
            singleRiderWaitTime={item.single_rider_wait_time_minutes ?? undefined}
            status={item.status || "Unknown"}
        />
    ), []);

    // Memoize the renderSectionHeader function
    const renderSectionHeader = useCallback(({ section }: { section: SectionListData<ParkChild> }) => (
        <Text style={{ 
            color: colors.primaryLight, 
            fontSize: 16, 
            fontWeight: "bold",
            backgroundColor: colors.primaryVeryDark,
            padding: 12,
            marginTop: 8,
            borderRadius: 6
        }}>
            {section.title} ({section.data.length})
        </Text>
    ), []);

    // Memoize key extractor
    const keyExtractor = useCallback((item: ParkChild) => item.id, []);

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
            "open": 1, 
            "operating": 1, 
            "down": 2, 
            "closed": 3, 
            "refurbishment": 4 
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
        }, {} as Record<string, ParkChild[]>);

        // Sort items within each group alphabetically
        Object.keys(groupedItems).forEach(status => {
            groupedItems[status].sort((a, b) => a.name.localeCompare(b.name));
        });

        // Sort status groups by priority and create sections
        const sections = Object.keys(groupedItems)
            .sort((a, b) => {
                const priorityA = statusOrder[a] || 999;
                const priorityB = statusOrder[b] || 999;
                return priorityA - priorityB;
            })
            .map(status => ({
                title: status === "open" ? "Operating" : status.charAt(0).toUpperCase() + status.slice(1),
                data: groupedItems[status],
                status: status
            }));

        return (
            <SectionList
                sections={sections}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={keyExtractor}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={{ padding: 16, gap: 8 }}
                ItemSeparatorComponent={ItemSeparator}
                SectionSeparatorComponent={SectionSeparator}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                getItemLayout={undefined}
            />
        );
    };
