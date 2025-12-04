// filepath: c:\webdev\airtimely\app\index.tsx
// React / React Native Imports
import React, { useState, useRef, useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
// Expo Imports
import { Image } from "expo-image";
// 3rd Party Imports
import { Input, InputField, InputSlot, Text, Pressable } from "@/src/components/ui";
// Local Imports
import { FooterCredits } from "@/src/components/footerCredits";
import { colors, styles } from "@/src/styles/styles";
import { DestinationList } from "@/src/components/destinationList";
import { Icon } from "@/src/components/Icon";

export default function HomeScreen() {
	console.log("HomeScreen rendered");
	const [parkFilterInput, setParkFilterInput] = useState(""); // Actual input value
	const [debouncedParkFilter, setDebouncedParkFilter] = useState(""); // Debounced value for filtering
	const [isRefreshing, setIsRefreshing] = useState(false);
	const destinationListRef = useRef<{ refresh: () => Promise<void> }>(null);

	// Debounce the search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedParkFilter(parkFilterInput);
		}, 300); // 300ms delay

		return () => clearTimeout(timer);
	}, [parkFilterInput]);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await destinationListRef.current?.refresh();
		} catch (error) {
			console.error("Error refreshing destinations:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	return (
		<SafeAreaProvider style={{ flex: 1, backgroundColor: colors.primaryBlack }}>
			{/* Header with Logo and Search */}
			<View style={styles.homeHeader}>
				{/* Logo */}
				<Image source={require("@/src/assets/images/Airtimely Logo Teal.svg")} style={styles.logo} contentFit="contain" />
				{/* Search and Refresh Container */}
				<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
					{/* Search Input */}
					<Input style={[styles.parkFilterInput, { flex: 1 }]}>
						<InputField placeholder="Search for park..." placeholderTextColor={colors.primaryLight} value={parkFilterInput} onChangeText={setParkFilterInput} style={styles.parkFilterInputField} />
						{parkFilterInput.length > 0 && (
							<InputSlot onPress={() => setParkFilterInput("")} style={styles.clearButton} hitSlop={10}>
								<Icon name="close" fill={colors.primaryVeryLight} height={24} width={24} />
							</InputSlot>
						)}
					</Input>

					{/* Refresh Button */}
					<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} style={{ backgroundColor: colors.primaryVeryDark, borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 8, padding: 8, overflow: "hidden" }} onPress={handleRefresh} disabled={isRefreshing}>
						<Icon name="refresh" fill={colors.primaryLight} height={24} width={24} />
					</Pressable>
				</View>
			</View>

			{/* Destinations View */}
			<SafeAreaProvider style={{ paddingHorizontal: 16, flexGrow: 1 }}>
				<DestinationList ref={destinationListRef} searchFilter={debouncedParkFilter} />
			</SafeAreaProvider>

			{/* Footer with Waitingtimes.APP credits */}
			<FooterCredits />
		</SafeAreaProvider>
	);
}
