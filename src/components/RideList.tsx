// React / React Native Imports
import React, { useState } from "react";
import { FlatList, View, StyleSheet } from "react-native";
// 3rd Party Imports
import { Text, Select, SelectBackdrop, SelectContent, SelectInput, SelectItem, SelectIcon, SelectPortal, SelectTrigger, SelectDragIndicatorWrapper, SelectDragIndicator } from "@/src/components/ui";
import { ChevronDown } from "lucide-react-native";
// Local Imports
import { ridesListStyles } from "@/src/styles";
import { RideListItem } from "./RideListItem";

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

	return (
		<>
			<FlatList
				data={rides}
				keyExtractor={(item, index) => (item && item.code ? item.code : `ride-${index}`)}
				renderItem={({ item }) => <RideListItem item={item} waitTimeIcons={waitTimeIcons} styles={styles} />}
				windowSize={11} // Default is 21. Adjust based on item complexity and screen size.
				maxToRenderPerBatch={10} // Default is 10.
				initialNumToRender={10} // Default is 10.
			/>
		</>
	);
}
