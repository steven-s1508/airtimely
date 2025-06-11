// filepath: c:\webdev\airtimely\app\index.tsx
// React / React Native Imports
import React, { useState } from "react";
import { View } from "react-native";
// import { useNavigation, NavigationProp } from "@react-navigation/native"; // Remove: No longer needed
import { SafeAreaView } from "react-native-safe-area-context";
// Expo Imports
import { Image } from "expo-image";
// 3rd Party Imports
import { Input, InputField, InputSlot, Text } from "@/src/components/ui"; // Removed Pressable, VStack, Link, LinkText as they were not used in the provided snippet for HomeScreen
// Local Imports
import { FooterCredits } from "@/src/components/footerCredits";
import { colors, styles } from "@/src/styles/styles";
import { DestinationList } from "@/src/components/destinationList"; // Ensure this component is updated for expo-router if it navigates
import { Icon } from "@/src/components/Icon";

// Note: If DestinationList or other child components perform navigation,
// they will also need to be updated to use expo-router's useRouter or Link.

export default function HomeScreen() {
	const [parkFilterInput, setParkFilterInput] = useState(""); // Actual input value
	// const [debouncedParkFilter, setDebouncedParkFilter] = useState(""); // Debounced value for filtering - not used in snippet

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.primaryBlack }}>
			{/* Header with Logo and Search */}
			<View style={styles.homeHeader}>
				{/* Logo */}
				<Image source={require("@/src/assets/Airtimely Logo Teal.svg")} style={styles.logo} contentFit="contain" />
				{/* Search Input */}
				<Input style={styles.parkFilterInput}>
					<InputField placeholder="Search for park..." value={parkFilterInput} onChangeText={setParkFilterInput} style={styles.parkFilterInputField} />
					{parkFilterInput.length > 0 && (
						<InputSlot onPress={() => setParkFilterInput("")} style={styles.clearButton} hitSlop={10}>
							<Icon name="close" fill={colors.primaryVeryDark} height={24} width={24} />
						</InputSlot>
					)}
				</Input>
			</View>

			{/* Destinations View */}
			<View style={{ paddingHorizontal: 16 }}>
				<DestinationList />
			</View>

			{/* Footer with Waitingtimes.APP credits */}
			<FooterCredits />
		</SafeAreaView>
	);
}
