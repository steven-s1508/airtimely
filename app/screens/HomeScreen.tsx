// React / React Native Imports
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
// Expo Imports
import { Image } from "expo-image";
// 3rd Party Imports
import { Input, InputField, InputSlot, Pressable } from "@/components/ui";
import { AntDesign } from "@expo/vector-icons";
// Local Imports
import { ParksLists } from "@/components/parksLists";
import { FooterCredits } from "@/components/footerCredits";
import { styles } from "@/styles/styles";

type RootStackParamList = { Park: { id: string; name: string; land: string } };
type HomeScreenNavigationProp = NavigationProp<RootStackParamList>;

const PARK_CARD_HEIGHT = 200;
const PARK_CARD_MARGIN_BOTTOM = 16;
const TOTAL_PARK_CARD_HEIGHT = PARK_CARD_HEIGHT + PARK_CARD_MARGIN_BOTTOM;

export default function HomeScreen() {
	const [parkFilterInput, setParkFilterInput] = useState(""); // Actual input value
	const [debouncedParkFilter, setDebouncedParkFilter] = useState(""); // Debounced value for filtering

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<View style={styles.container}>
				{/* Header with Logo and Search */}
				<View style={styles.homeHeader}>
					{/* Logo */}
					<Image source={require("@/assets/Airtimely Logo Teal.svg")} style={styles.logo} contentFit="contain" />
					{/* Search Input */}
					<Input style={styles.parkFilterInput}>
						<InputField placeholder="Search for park..." value={parkFilterInput} onChangeText={setParkFilterInput} style={styles.parkFilterInputField} />
						{parkFilterInput.length > 0 && (
							<InputSlot onPress={() => setParkFilterInput("")} style={styles.clearButton} hitSlop={10}>
								<AntDesign name="close" size={18} color="#888" />
							</InputSlot>
						)}
					</Input>
				</View>

				{/* Parks View Select and Parks Lists */}
				<ParksLists />

				{/* Footer with Waitingtimes.APP credits */}
				<FooterCredits />
			</View>
		</SafeAreaView>
	);
}
