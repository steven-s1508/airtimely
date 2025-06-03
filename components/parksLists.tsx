// React / React Native Imports
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FlatList, SectionList, Pressable, View } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
// 3rd Party Imports
import { Text, Select, SelectBackdrop, SelectContent, SelectInput, SelectItem, SelectIcon, SelectPortal, SelectTrigger, SelectDragIndicatorWrapper, SelectDragIndicator } from "@/components/ui";
import { ChevronDown } from "lucide-react-native";
// Local Imports
import { parksListStyles } from "@/styles";
import { useParks } from "@/app/api/useParks";
import { Park } from "@/app/types/park";
import { ParkCard } from "@/components/parkCard";

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

const normalizeCountryName = (countryName: string) => {
	const countryMap: Record<string, string> = { "Vereinigte Staaten": "United States" };
	return countryMap[countryName] || countryName;
};

type RootStackParamList = { Park: { id: string; name: string } };
type HomeScreenNavigationProp = NavigationProp<RootStackParamList>;

export const ParksLists = () => {
	// Parks view select states
	const [parksViewSelect, setParksViewSelect] = useState<"By Country" | "Alphabetical">("By Country");
	// Parks view list options
	const parksViewOptions: Array<{ country: { title: "By Country" | "Alphabetical"; value: string } }> = [{ country: { title: "By Country", value: "country" } }, { country: { title: "Alphabetical", value: "alphabetical" } }];

	// Parks list loading state
	const [loadingParksList, setLoadingParksList] = useState<boolean>(true);

	const { data: parksData, isLoading, error, refetch } = useParks();
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const [parkFilterInput, setParkFilterInput] = useState(""); // Actual input value
	const [debouncedParkFilter, setDebouncedParkFilter] = useState(""); // Debounced value for filtering

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

	// Select list for parks view
	const selectParksView = (
		<Select
			style={parksListStyles.parksViewSelect}
			defaultValue="country"
			initialLabel="By Country"
			selectedValue={parksViewOptions.find((option) => option.country.title === parksViewSelect)?.country.value}
			onValueChange={(valueFromSelect) => {
				// valueFromSelect is "country" or "alphabetical"
				const selectedOptionContainer = parksViewOptions.find((option) => option.country.value === valueFromSelect);
				if (selectedOptionContainer) {
					// Update the state with the title ("By Country" or "Alphabetical")
					setParksViewSelect(selectedOptionContainer.country.title);
					console.log("Selected parks view:", selectedOptionContainer.country.title);
				}
			}}
		>
			<SelectTrigger style={parksListStyles.selectTrigger}>
				<SelectInput style={parksListStyles.selectInput} />
				<SelectIcon className="mr-3" as={ChevronDown} />
			</SelectTrigger>
			<SelectPortal>
				<SelectBackdrop />
				<SelectContent style={{ maxHeight: 200 }}>
					<SelectDragIndicatorWrapper>
						<SelectDragIndicator />
					</SelectDragIndicatorWrapper>
					{parksViewOptions.map((option) => (
						<SelectItem key={option.country.value} value={option.country.value} label={option.country.title} />
					))}
				</SelectContent>
			</SelectPortal>
		</Select>
	);

	return (
		<View style={parksListStyles.parksListContainer}>
			<View style={parksListStyles.parksViewSelectContainer}>
				<Text style={parksListStyles.parksViewSelectLabel}>Parks View:</Text>
				{selectParksView}
			</View>
			<View style={parksListStyles.parksListViewContainer}>
				{parksViewSelect === "By Country" ? (
					<FlatList
						style={parksListStyles.parksListViewInnerContainer}
						ref={countryFlatListRef}
						data={countryList}
						keyExtractor={(item) => item}
						maxToRenderPerBatch={6}
						windowSize={7}
						removeClippedSubviews={true}
						initialNumToRender={6}
						renderItem={({ item: countryName }) => (
							<View style={parksListStyles.countrySection}>
								<Text style={parksListStyles.countryNameText}>{countryName}</Text>
								<FlatList data={parksMatrixFiltered[countryName]} keyExtractor={(park, index) => (park && park.id ? park.id : `park-${countryName}-${index}`)} renderItem={({ item }) => <ParkCard item={item} />} />
							</View>
						)}
						onScrollToIndexFailed={(info) => {
							if (countryFlatListRef.current) {
								countryFlatListRef.current.scrollToOffset({ offset: 0, animated: true });
							}
						}}
					/>
				) : (
					<FlatList
						style={parksListStyles.parksListViewInnerContainer}
						ref={alphaFlatListRef}
						data={filteredParksForAlphaTab}
						keyExtractor={(item, index) => (item && item.id ? item.id : `alpha-park-${index}`)}
						maxToRenderPerBatch={6}
						windowSize={7}
						removeClippedSubviews={true}
						initialNumToRender={5}
						getItemLayout={(data, index) => ({ length: 200, offset: 200 * index, index })}
						renderItem={({ item }) => <ParkCard item={item} />}
						onScrollToIndexFailed={(info) => {
							if (alphaFlatListRef.current) {
								alphaFlatListRef.current.scrollToOffset({ offset: 0, animated: true });
							}
						}}
					/>
				)}
			</View>
			{/* <View style={parksListStyles.parksListContainer}></View>
			{(!parksData || parksData.length === 0) && !isLoading && !error && <Text style={styles.centeredMessageText}>No parks available.</Text>}
			{parksData && parksData.length > 0 && countryList.length === 0 && activeTab.title === "By Country" && debouncedParkFilter && <Text style={styles.centeredMessageText}>No parks found for "{debouncedParkFilter}".</Text>}
			{parksData && parksData.length > 0 && alphabeticalData.length === 0 && activeTab.title === "Alphabetical" && debouncedParkFilter && <Text style={styles.centeredMessageText}>No parks found for "{debouncedParkFilter}".</Text>}

			{
				<Box style={styles.contentRow}>
					<Box style={styles.mainContent}>
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
				</Box>
			} */}
		</View>
	);
};
