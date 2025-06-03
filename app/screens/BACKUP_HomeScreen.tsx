// React / React Native Imports
import React, { useState, useEffect, useCallback, useRef } from "react";
import { FlatList, TextInput, Text, View, ImageBackground, StyleSheet, ActivityIndicator, Pressable as RNPressable } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
// Expo Imports
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
// Gluestack UI Imports
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
// 3rd Party Imports
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AntDesign from "@react-native-vector-icons/ant-design";
// Local Imports
import { useParks } from "../api/useParks";
import { getParkImage } from "../utils/images";
import { Park } from "../types/park";

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	const debounced = (...args: Parameters<F>) => {
		if (timeout !== null) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => func(...args), waitFor);
	};
	return debounced as (...args: Parameters<F>) => void; // Ensure void return for setState
}

const tabs = [{ title: "By Country" }, { title: "Alphabetical" }];

const normalizeCountryName = (countryName: string) => {
	const countryMap: Record<string, string> = { "Vereinigte Staaten": "United States" };
	return countryMap[countryName] || countryName;
};

type RootStackParamList = { Park: { id: string; name: string } };
type HomeScreenNavigationProp = NavigationProp<RootStackParamList>;

const PARK_CARD_HEIGHT = 200;
const PARK_CARD_MARGIN_BOTTOM = 16;
const TOTAL_PARK_CARD_HEIGHT = PARK_CARD_HEIGHT + PARK_CARD_MARGIN_BOTTOM;

export default function HomeScreen() {
	const { data: parksData, isLoading, error, refetch } = useParks();
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const [parkFilterInput, setParkFilterInput] = useState(""); // Actual input value
	const [debouncedParkFilter, setDebouncedParkFilter] = useState(""); // Debounced value for filtering
	const [activeTab, setActiveTab] = useState(tabs[0]);

	const debouncedSetFilterCallback = useCallback(debounce(setDebouncedParkFilter, 300), []);

	useEffect(() => {
		debouncedSetFilterCallback(parkFilterInput);
	}, [parkFilterInput, debouncedSetFilterCallback]);

	const { parksMatrixSorted, parksMatrixFiltered, filteredParksForAlphaTab } = React.useMemo(() => {
		const rawParks = parksData || [];
		const matrixRaw: { [key: string]: Park[] } = {};
		rawParks.forEach((park: Park) => {
			const normalizedCountry = normalizeCountryName(park.land);
			if (!matrixRaw[normalizedCountry]) matrixRaw[normalizedCountry] = [];
			matrixRaw[normalizedCountry].push(park);
		});

		const sortedMatrix: { [key: string]: Park[] } = {};
		Object.keys(matrixRaw)
			.sort()
			.forEach((country) => {
				sortedMatrix[country] = [...matrixRaw[country]].sort((a, b) => a.name.localeCompare(b.name));
			});

		let filteredForAlpha = rawParks;
		if (debouncedParkFilter) {
			filteredForAlpha = rawParks.filter((p) => p.name.toLowerCase().includes(debouncedParkFilter.toLowerCase()));
		}
		filteredForAlpha.sort((a, b) => a.name.localeCompare(b.name));

		if (!debouncedParkFilter) {
			return { parksMatrixSorted: sortedMatrix, parksMatrixFiltered: sortedMatrix, filteredParksForAlphaTab: filteredForAlpha };
		}

		const filteredMatrixResult: { [key: string]: Park[] } = {};
		Object.keys(sortedMatrix).forEach((country) => {
			const filteredCountryParks = sortedMatrix[country].filter((park) => park.name.toLowerCase().includes(debouncedParkFilter.toLowerCase()));
			if (filteredCountryParks.length > 0) filteredMatrixResult[country] = filteredCountryParks;
		});

		return { parksMatrixSorted: sortedMatrix, parksMatrixFiltered: filteredMatrixResult, filteredParksForAlphaTab: filteredForAlpha };
	}, [parksData, debouncedParkFilter]);

	const countryList = React.useMemo(() => Object.keys(parksMatrixFiltered), [parksMatrixFiltered]);
	const countryFlatListRef = useRef<FlatList<string>>(null);
	const alphaFlatListRef = useRef<FlatList<Park>>(null);

	/* const countryLetters = React.useMemo(() => Array.from(new Set(Object.keys(parksMatrixFiltered).map((c) => c[0].toUpperCase()))).sort(), [parksMatrixFiltered]);
	const alphaLetters = React.useMemo(() => Array.from(new Set(filteredParksForAlphaTab.map((p) => p.name[0].toUpperCase()))).sort(), [filteredParksForAlphaTab]);

	const getCountryIndexByLetter = (letter: string) => Object.keys(parksMatrixFiltered).findIndex((c) => c[0].toUpperCase() === letter);
	const getAlphaIndexByLetter = (letter: string) => filteredParksForAlphaTab.findIndex((p) => p.name[0].toUpperCase() === letter); */

	const alphabeticalData = React.useMemo(() => (activeTab.title === "Alphabetical" ? filteredParksForAlphaTab : []), [activeTab.title, filteredParksForAlphaTab]);

	if (isLoading)
		return (
			<SafeAreaProvider>
				<SafeAreaView style={styles.centeredMessage}>
					<ActivityIndicator size="large" color="#333" />
					<Text style={styles.messageText}>Loading parks...</Text>
				</SafeAreaView>
			</SafeAreaProvider>
		);
	if (error)
		return (
			<SafeAreaProvider>
				<SafeAreaView style={styles.centeredMessage}>
					<MaterialIcons name="error-outline" size={48} color="red" />
					<Text style={styles.messageText}>Error: {error.message}</Text>
					<RNPressable onPress={() => refetch()} style={({ pressed }) => [styles.retryButton, { backgroundColor: pressed ? colors.primary : colors.textSecondary }]}>
						<Text style={styles.retryButtonText}>Try Again</Text>
					</RNPressable>
				</SafeAreaView>
			</SafeAreaProvider>
		);

	const renderParkCard = ({ item: park }: { item: Park }) => (
		<Pressable style={styles.parkCardStyleOuter} android_ripple={{ color: "#fff", foreground: true }} onPress={() => navigation.navigate("Park", { id: park.id, name: park.name })}>
			<ImageBackground source={getParkImage(park.id)} resizeMode="cover" style={styles.parkCardStyleInner}>
				<LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,1)"]} style={StyleSheet.absoluteFill} locations={[0.5, 0.95]} />
				<Text style={styles.textParkNameStyle}>{park.name}</Text>
				<Text style={styles.textTapToViewStyle}>Tap to view</Text>
			</ImageBackground>
		</Pressable>
	);

	const handleScrollToIndexFailed = (ref: React.RefObject<FlatList<any>>, index: number) => {
		ref.current?.scrollToEnd({ animated: false }); // Scroll to end without animation first
		setTimeout(() => {
			ref.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
		}, 100); // Short delay
	};

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.container}>
				<View style={styles.logoContainer}>
					<Image source={require("@/assets/Airtimely Logo Teal.svg")} style={styles.logo} contentFit="contain" />
				</View>
				<Box style={styles.filterContainer}>
					<TextInput placeholder="Filter by park name" value={parkFilterInput} onChangeText={setParkFilterInput} style={styles.filterInput} />
					{parkFilterInput.length > 0 && (
						<Pressable onPress={() => setParkFilterInput("")} style={styles.clearButton} hitSlop={10}>
							<AntDesign name="close" size={18} color="#888" />
						</Pressable>
					)}
				</Box>

				{(!parksData || parksData.length === 0) && !isLoading && !error && <Text style={styles.centeredMessageText}>No parks available.</Text>}
				{parksData && parksData.length > 0 && countryList.length === 0 && activeTab.title === "By Country" && debouncedParkFilter && <Text style={styles.centeredMessageText}>No parks found for "{debouncedParkFilter}".</Text>}
				{parksData && parksData.length > 0 && alphabeticalData.length === 0 && activeTab.title === "Alphabetical" && debouncedParkFilter && <Text style={styles.centeredMessageText}>No parks found for "{debouncedParkFilter}".</Text>}

				<Box style={styles.contentRow}>
					<Box style={styles.mainContent}>
						<Box style={styles.segmentedButtonsStyle}>
							{tabs.map((tab) => (
								<Pressable key={tab.title} style={[styles.tabBase, activeTab.title === tab.title && styles.tabActive]} onPress={() => setActiveTab(tab)}>
									<Text style={[styles.tabTextBase, activeTab.title === tab.title && styles.tabTextActive]}>{tab.title}</Text>
								</Pressable>
							))}
						</Box>
						<Box style={{ flex: 1 }}>
							{activeTab.title === "By Country" && (
								<FlatList
									ref={countryFlatListRef}
									data={countryList}
									keyExtractor={(item) => item}
									maxToRenderPerBatch={6}
									windowSize={7}
									removeClippedSubviews={true}
									initialNumToRender={6}
									renderItem={({ item: countryName }) => (
										<Box style={styles.countrySection}>
											<Text style={styles.countryNameText}>{countryName}</Text>
											<FlatList data={parksMatrixFiltered[countryName]} keyExtractor={(park, index) => (park && park.id ? park.id : `park-${countryName}-${index}`)} renderItem={renderParkCard} />
										</Box>
									)}
									onScrollToIndexFailed={(info) => handleScrollToIndexFailed(countryFlatListRef, info.index)}
								/>
							)}
							{activeTab.title === "Alphabetical" && <FlatList ref={alphaFlatListRef} data={alphabeticalData} keyExtractor={(item, index) => (item && item.id ? item.id : `alpha-park-${index}`)} maxToRenderPerBatch={6} windowSize={7} removeClippedSubviews={true} initialNumToRender={5} getItemLayout={(data, index) => ({ length: TOTAL_PARK_CARD_HEIGHT, offset: TOTAL_PARK_CARD_HEIGHT * index, index })} renderItem={renderParkCard} onScrollToIndexFailed={(info) => handleScrollToIndexFailed(alphaFlatListRef, info.index)} />}
						</Box>
					</Box>
					{/* {(countryLetters.length > 0 || alphaLetters.length > 0) && (
						<View style={styles.letterSidebarOuter}>
							<VStack style={styles.letterSidebarInner}>
								{(activeTab.title === "By Country" ? countryLetters : alphaLetters).map((letter, index) => (
									<Pressable
										key={letter}
										style={[styles.sidebarLetterPressable, index === (activeTab.title === "By Country" ? countryLetters : alphaLetters).length - 1 && styles.sidebarLetterPressableLast]}
										android_ripple={{ color: "rgba(0, 0, 0, 0.2)" }}
										onPress={() => {
											const ref = activeTab.title === "By Country" ? countryFlatListRef : alphaFlatListRef;
											const index = activeTab.title === "By Country" ? getCountryIndexByLetter(letter) : getAlphaIndexByLetter(letter);
											if (index !== -1 && ref.current) ref.current.scrollToIndex({ index, animated: true, viewPosition: 0 });
										}}
									>
										<Text style={styles.sidebarLetterText}>{letter}</Text>
									</Pressable>
								))}
							</VStack>
						</View>
					)} */}
				</Box>
			</SafeAreaView>
		</SafeAreaProvider>
	);
}

const colors = {
	// Primary colors
	primaryWhite: "#EDF8F8",
	primaryVeryLight: "#C9F3F3",
	primaryLight: "#88DDDD",
	primary: "#0E9898",
	primaryDark: "#0E5858",
	primaryVeryDark: "#072C2C",
	primaryBlack: "#031717",
	// Secondary colors
	secondaryWhite: "#F0F0F0",
	secondaryLight: "#BEBEBE",
	secondary: "#868686",
	secondaryDark: "#3F3F3F",
	secondaryBlack: "#101010",
	// Accent colors
	accentWhite: "#FDF8F1",
	accentVeryLight: "#FCE9CF",
	accentLight: "#F9C376",
	accent: "#FC9C12",
	accentDark: "#8F5019",
	accentVeryDark: "#301908",
	accentBlack: "#140B05",
	// Text colors
	textPrimary: "#031717",
	textSecondary: "#3F3F3F",
	textTertiary: "#868686",
	textAccent: "#FC9C12",
	// Background colors
	backgroundPrimary: "#EDF8F8",
	backgroundSecondary: "#F0F0F0",
	backgroundAccent: "#FDF8F1",
	// Border colors
	borderLight: "#EEE",
	border: "#CCC",
	borderDark: "#AAA",
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#fff", paddingTop: 16 },
	centeredMessage: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
	messageText: { marginTop: 10, fontSize: 16, color: colors.textSecondary, textAlign: "center" },
	centeredMessageText: { textAlign: "center", marginTop: 20, fontSize: 16, color: colors.textTertiary },
	retryButton: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 8 },
	retryButtonText: { color: colors.primaryWhite, fontWeight: "bold" },
	logoContainer: { alignItems: "center" },
	logo: { width: 92, height: 60, marginBottom: 20 },
	filterContainer: { position: "relative", marginBottom: 10, marginHorizontal: 16 },
	filterInput: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, borderColor: colors.border, fontSize: 16, paddingRight: 36, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary },
	clearButton: { position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 30 },
	contentRow: { flex: 1, flexDirection: "row" },
	mainContent: { flex: 1 },
	segmentedButtonsStyle: { flexDirection: "row", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.borderLight },
	tabBase: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: colors.border },
	tabActive: { borderBottomColor: colors.primary },
	tabTextBase: { fontWeight: "bold", fontSize: 16, color: colors.textTertiary },
	tabTextActive: { color: colors.primary },
	countrySection: { marginTop: 8, marginBottom: 12, paddingHorizontal: 0 }, // Removed horizontal padding here, park card has margin
	countryNameText: { fontSize: 18, fontWeight: "bold", marginBottom: 10, marginHorizontal: 16, color: colors.textPrimary },
	parkCardStyleOuter: { borderRadius: 12, marginBottom: PARK_CARD_MARGIN_BOTTOM, marginHorizontal: 16, shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 2, overflow: "hidden", height: PARK_CARD_HEIGHT, backgroundColor: colors.backgroundSecondary },
	parkCardStyleInner: { flexDirection: "column", flex: 1, height: "100%", padding: 16, justifyContent: "flex-end" },
	textParkNameStyle: { fontFamily: "Bebas Neue Pro", fontSize: 27, fontWeight: "bold", color: colors.primaryWhite },
	textTapToViewStyle: { color: colors.textTertiary, marginTop: 4, fontSize: 13 },
	letterSidebarOuter: { position: "absolute", justifyContent: "center", alignItems: "center", width: 28, height: "100%", paddingVertical: 8, right: -8, top: 0 },
	letterSidebarInner: { alignItems: "center", justifyContent: "center", borderRadius: 8, width: "100%", backgroundColor: colors.primaryVeryLight, shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 2 },
	sidebarLetterPressable: { paddingHorizontal: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.primaryLight, width: "100%", alignItems: "center", justifyContent: "center" },
	sidebarLetterPressableLast: { borderBottomWidth: 0 },
	sidebarLetterText: { fontWeight: "bold", color: colors.textPrimary, fontSize: 14 },
});
