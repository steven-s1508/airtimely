// React / React Native Imports
import React from "react";
import { Text, View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { uses24HourClock } from "react-native-localize";
// Expo Imports
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// Gluestack UI Imports
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { VStack } from "@/components/ui/vstack";
/* import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetItem, ActionsheetItemText } from "@/components/ui/actionsheet"; */
// 3rd Party Imports
// Local Imports
import { ParkHeader } from "@/components/parkHeader";
import { useRideWaitTimes } from "../api/useRideWaitTimes";
import { useParkOpeningTimes } from "../api/useParkOpeningTimes";
// import { coordinates } from "../utils/coordinates"; // Unused import
import { sortRidesByStatus } from "../utils/rideStatus";
import { waitTimeIcons } from "../utils/waitTimeIcons";
import { ParkOpeningTimes as ParkOpeningTimesDisplay } from "@/components/parkOpeningTimes"; // Renamed component import
import { RideList } from "@/components/RideList";
import { Ride } from "../types/park"; // Import Ride type
import { RIDE_STATUS } from "../constants/rideStatus"; // Import RIDE_STATUS

type ParkScreenRouteParams = {
	Park: {
		id: string;
		name: string;
	};
};

type ParkScreenProps = {
	route: RouteProp<ParkScreenRouteParams, "Park">;
};

/* type OpenRideSortType = "default" | "name" | "waitTime"; */

export default function ParkScreen({ route }: ParkScreenProps) {
	const { id, name } = route.params;

	const { data: waitTimesData, isLoading: isLoadingWaitTimes, isRefetching: isRefetchingWaitTimes, refetch: refetchWaitTimes, error: waitTimesError } = useRideWaitTimes(id);
	const { data: parkOpeningTimesData, isLoading: isLoadingOpeningTimes, isRefetching: isRefetchingOpeningTimes, refetch: refetchOpeningTimes, error: openingTimesError } = useParkOpeningTimes(id);

	/* const [showSortOptions, setShowSortOptions] = React.useState(false);
	const [openRideSort, setOpenRideSort] = React.useState<OpenRideSortType>("default"); */

	const processedWaitTimes: Ride[] = React.useMemo(() => {
		const ridesSortedByStatus = sortRidesByStatus(waitTimesData);
		return ridesSortedByStatus;

		/* if (openRideSort === "default") {
			return ridesSortedByStatus; // Default sort (by status, then name within status)
		}

		// Extract open rides with wait times to be specially sorted
		const openRidesToSort: Ride[] = [];
		ridesSortedByStatus.forEach((ride) => {
			if (ride.status === RIDE_STATUS.OPENED && typeof ride.waitingtime === "number") {
				openRidesToSort.push(ride);
			}
		});

		// Sort these open rides based on the selected criteria
		if (openRideSort === "name") {
			openRidesToSort.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
		} else if (openRideSort === "waitTime") {
			openRidesToSort.sort((a, b) => {
				const waitA = a.waitingtime ?? Infinity;
				const waitB = b.waitingtime ?? Infinity;
				if (waitA === waitB) {
					return (a.name || "").localeCompare(b.name || ""); // Sub-sort by name
				}
				return waitA - waitB;
			});
		}

		// Reconstruct the full list, replacing the original open rides with the newly sorted ones
		let openRideIdx = 0;
		const finalSortedRides = ridesSortedByStatus.map((ride) => {
			if (ride.status === RIDE_STATUS.OPENED && typeof ride.waitingtime === "number" && openRideIdx < openRidesToSort.length) {
				// This ride was part of the group we specially sorted
				return openRidesToSort[openRideIdx++];
			}
			return ride; // Keep other rides (non-open, or open without wait times) as they were
		});

		return finalSortedRides; */
	}, [waitTimesData /*, openRideSort */]);

	const toast = useToast();

	// Ref to store the stable toast.show function
	const showToastFnRef = React.useRef(toast.show);

	React.useEffect(() => {
		showToastFnRef.current = toast.show;
	}, [toast.show]);

	React.useEffect(() => {
		if (waitTimesError?.message) {
			// Call the toast.show function via the ref
			showToastFnRef.current({
				placement: "top",
				duration: 3000,
				render: ({ id: toastId }) => (
					<Toast nativeID={toastId} action="error" variant="outline" style={styles.toastStyleError}>
						<VStack space="xs">
							<ToastTitle>Error</ToastTitle>
							<ToastDescription>Failed to load ride wait times: {waitTimesError.message}</ToastDescription>
						</VStack>
					</Toast>
				),
			});
		}
	}, [waitTimesError?.message]);

	React.useEffect(() => {
		if (openingTimesError?.message) {
			// Call the toast.show function via the ref
			showToastFnRef.current({
				placement: "top",
				duration: 3000,
				render: ({ id: toastId }) => (
					<Toast nativeID={toastId} action="error" variant="outline" style={styles.toastStyleError}>
						<VStack space="xs">
							<ToastTitle>Error</ToastTitle>
							<ToastDescription>Failed to load park opening times: {openingTimesError.message}</ToastDescription>
						</VStack>
					</Toast>
				),
			});
		}
	}, [openingTimesError?.message]);

	const { hasOpeningTimes, openToday, openingTime, closingTime } = React.useMemo(() => {
		// If there's an error fetching opening times, treat it as not having opening times for display purposes.
		if (openingTimesError) {
			return {
				hasOpeningTimes: false,
				openToday: false,
				openingTime: null,
				closingTime: null,
			};
		}

		const currentParkOpeningTimes = parkOpeningTimesData?.data && parkOpeningTimesData.data.length > 0 ? parkOpeningTimesData.data[0] : null;

		return {
			hasOpeningTimes: !!currentParkOpeningTimes,
			openToday: currentParkOpeningTimes ? currentParkOpeningTimes.opened_today : false,
			openingTime: currentParkOpeningTimes ? currentParkOpeningTimes.open_from : null,
			closingTime: currentParkOpeningTimes ? currentParkOpeningTimes.closed_from : null,
		};
	}, [parkOpeningTimesData, openingTimesError]);

	// Combined loading state
	if (isLoadingWaitTimes || isLoadingOpeningTimes) {
		return (
			<SafeAreaView style={styles.centeredStatusContainer}>
				<ActivityIndicator size="large" color="#333" />
				<Text style={styles.statusText}>Loading park data...</Text>
			</SafeAreaView>
		);
	}

	// Combined error state
	/* if (waitTimesError || openingTimesError) {
		return (
			<SafeAreaView style={styles.centeredStatusContainer}>
				<MaterialIcons name="error-outline" size={48} color="red" />
				<Text style={[styles.statusText, { fontSize: 16, textAlign: "center" }]}>Sorry, an error occurred.</Text>
				<Text style={[styles.statusText, { fontSize: 14, color: "#666", textAlign: "center" }]}>{waitTimesError?.message || openingTimesError?.message}</Text>
				<Pressable
					onPress={() => {
						refetchWaitTimes();
						refetchOpeningTimes();
					}}
					style={styles.retryButton}
					disabled={isRefetchingWaitTimes || isRefetchingOpeningTimes}
					android_ripple={{ color: "rgba(0, 0, 0, 0.2)" }}
					accessibilityRole="button"
				>
					<Text style={styles.retryButtonText}>Try Again {isRefetchingWaitTimes || isRefetchingOpeningTimes ? <ActivityIndicator size={16} color="#fff" /> : <MaterialIcons name="refresh" size={16} color="#fff" />}</Text>
				</Pressable>
			</SafeAreaView>
		);
	}
 */
	const formatTime = (timeString: string | null): string => {
		if (!timeString) return "N/A";

		const date = new Date(timeString); // Directly parse the ISO string

		if (isNaN(date.getTime())) {
			// Check if the date object is valid
			console.error("Invalid date string received:", timeString);
			return "Invalid time";
		}

		if (uses24HourClock()) {
			return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
		} else {
			return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
		}
	};

	const handleRefresh = async () => {
		toast.show({
			placement: "top",
			duration: 1500,
			render: ({ id: toastId }) => {
				return (
					<Toast nativeID={toastId} action="info" variant="outline" style={styles.toastStyle}>
						<VStack style={styles.toastContentStyle}>
							<ToastTitle style={styles.toastTitleStyle}>Refreshing</ToastTitle>
							<ToastDescription style={styles.toastDescriptionStyle}>Updating wait times...</ToastDescription>
						</VStack>
					</Toast>
				);
			},
		});

		try {
			await Promise.all([refetchWaitTimes(), refetchOpeningTimes()]);
			toast.show({
				placement: "top",
				duration: 1600,
				render: ({ id: toastId }) => {
					return (
						<Toast nativeID={toastId} action="success" variant="outline" style={{ ...styles.toastStyle, ...styles.toastStyleSuccess }}>
							<VStack style={styles.toastContentStyle}>
								<ToastTitle style={styles.toastTitleStyle}>Success!</ToastTitle>
								<ToastDescription style={styles.toastDescriptionStyle}>Wait times have been updated</ToastDescription>
							</VStack>
						</Toast>
					);
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			toast.show({
				placement: "top",
				duration: 3000,
				render: ({ id: toastId }) => {
					return (
						<Toast nativeID={toastId} action="error" variant="solid" style={styles.toastStyleError}>
							<VStack space="xs">
								<ToastTitle>Error</ToastTitle>
								<ToastDescription>Failed to refresh: {errorMessage}</ToastDescription>
							</VStack>
						</Toast>
					);
				},
			});
		}
	};

	/* const handleSortSelection = (sortType: OpenRideSortType) => {
		setOpenRideSort(sortType);
		setShowSortOptions(false);
	}; */

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
			<ParkHeader id={id} name={name} />
			<ParkOpeningTimesDisplay hasOpeningTimes={hasOpeningTimes} openToday={openToday} openingTime={openingTime} closingTime={closingTime} formatTime={formatTime} />

			<View style={styles.ridesHeaderContainer}>
				<Text style={styles.ridesHeader}>Rides</Text>
				<View style={{ flexDirection: "row" }}>
					{/* <Pressable onPress={() => setShowSortOptions(true)} style={styles.sortButton} accessibilityRole="button" accessibilityLabel="Sort rides">
						<MaterialIcons name="sort" size={24} color={colors.primaryWhite} />
					</Pressable> */}
					<Pressable onPress={handleRefresh} style={[styles.refreshButton, { marginLeft: 8 }]} disabled={isRefetchingWaitTimes || isRefetchingOpeningTimes} android_ripple={{ color: "rgba(0, 0, 0, 0.2)" }} accessibilityRole="button">
						{isRefetchingWaitTimes || isRefetchingOpeningTimes ? <ActivityIndicator size={24} color={colors.primaryWhite} /> : <MaterialIcons name="refresh" size={24} color={colors.primaryWhite} />}
					</Pressable>
				</View>
			</View>
			<Text style={styles.ridesHeaderNote}>Note: Wait times are updated every 5 minutes.</Text>
			<RideList rides={processedWaitTimes} waitTimeIcons={waitTimeIcons} styles={styles} />

			{/* <Actionsheet isOpen={showSortOptions} onClose={() => setShowSortOptions(false)} zIndex={999}>
				<ActionsheetBackdrop />
				<ActionsheetContent zIndex={999}>
					<ActionsheetDragIndicatorWrapper>
						<ActionsheetDragIndicator />
					</ActionsheetDragIndicatorWrapper>
					<ActionsheetItem onPress={() => handleSortSelection("default")}>
						<ActionsheetItemText>Default (Sort by Status)</ActionsheetItemText>
					</ActionsheetItem>
					<ActionsheetItem onPress={() => handleSortSelection("name")}>
						<ActionsheetItemText>Sort Open Rides by Name (A-Z)</ActionsheetItemText>
					</ActionsheetItem>
					<ActionsheetItem onPress={() => handleSortSelection("waitTime")}>
						<ActionsheetItemText>Sort Open Rides by Wait Time (Shortest First)</ActionsheetItemText>
					</ActionsheetItem>
				</ActionsheetContent>
			</Actionsheet> */}
		</SafeAreaView>
	);
}

// TODO: Break up JSON data into smaller chunks for better performance
// Idea: Maybe static map of parks with their IDs and names, then fetch wait times based on selected park ID
// This would reduce the amount of data loaded at once and improve performance on initial load

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

export const styles = StyleSheet.create({
	centeredStatusContainer: {
		// For loading/error states
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: colors.backgroundPrimary,
		padding: 16,
	},
	statusText: {
		marginTop: 10,
		color: colors.textPrimary,
	},
	retryButton: {
		marginTop: 20,
		paddingVertical: 10,
		paddingHorizontal: 20,
		backgroundColor: colors.primary,
		borderRadius: 8,
	},
	retryButtonText: {
		color: colors.primaryWhite,
		fontWeight: "bold",
	},
	toastStyle: {
		top: 32,
		paddingHorizontal: 8,
		paddingVertical: 4,
		width: "100%",
		maxWidth: 300,
		alignSelf: "center",
	},
	toastStyleSuccess: {
		borderColor: colors.primary,
		borderWidth: 1,
		backgroundColor: colors.primaryWhite,
		top: 32,
		paddingHorizontal: 8,
		paddingVertical: 4,
		width: "100%",
		maxWidth: 300,
		alignSelf: "center",
	},
	toastStyleError: {
		top: 32,
		// className: "w-full"
		width: "100%",
		maxWidth: 300,
		alignSelf: "center",
	},
	toastContentStyle: {
		alignItems: "center",
	},
	toastTitleStyle: {
		fontSize: 14,
		margin: 0,
		color: colors.textPrimary, // Ensure text color is visible
		fontWeight: "bold",
	},
	toastDescriptionStyle: {
		fontSize: 12,
		margin: 0,
		color: colors.textTertiary, // Ensure text color is visible
	},
	parkTimesHeader: {
		height: 125,
		justifyContent: "flex-end",
		backgroundColor: colors.backgroundSecondary,
		borderRadius: 12,
		marginBottom: 16,
		marginHorizontal: 16,
		padding: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		elevation: 2,
	},
	parkName: {
		fontSize: 24,
		fontWeight: "bold",
		color: colors.primaryWhite,
	},
	ridesHeaderContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		marginTop: 8, // Added some top margin
	},
	refreshButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: colors.primary,
	},
	sortButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: colors.primary, // Or another color like colors.secondaryDark
		// marginRight: 8, // Add if you want space between sort and refresh, handled by marginLeft on refreshButton now
	},
	ridesHeader: {
		fontSize: 18,
		fontWeight: "bold",
		color: colors.textSecondary,
		marginBottom: 4,
	},
	ridesHeaderNote: {
		fontSize: 12,
		color: colors.textTertiary,
		marginBottom: 12,
		marginHorizontal: 16,
	},
	rideItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 8,
		backgroundColor: colors.primaryWhite,
		borderColor: colors.primary,
		borderWidth: 1,
		borderRadius: 6,
		marginBottom: 8,
		marginHorizontal: 16,
		color: colors.textPrimary,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		elevation: 1,
	},
	rideItemClosed: {
		backgroundColor: colors.secondaryWhite,
		color: colors.textTertiary,
		borderColor: colors.secondary,
	},
	rideItemMaintenance: {
		backgroundColor: colors.accentWhite,
		color: colors.accentDark,
		borderColor: colors.accentLight,
	},
	rideItemClosedIce: {
		backgroundColor: colors.secondaryWhite,
		color: colors.textTertiary,
		borderColor: colors.secondary,
	},
	rideItemClosedWeather: {
		backgroundColor: colors.secondaryWhite,
		color: colors.textTertiary,
		borderColor: colors.secondary,
	},
	rideName: {
		fontSize: 16,
		fontWeight: "bold",
		maxWidth: "70%",
	},
	rideNameOpen: {
		color: colors.primaryVeryDark,
	},
	rideNameClosed: {
		color: colors.secondaryDark,
	},
	rideNameMaintenance: {
		color: colors.accentDark,
	},
	rideNameClosedIce: {
		color: "#326267",
	},
	rideNameClosedWeather: {
		color: "#3E5174",
	},
	rideWaitTime: {
		alignItems: "center",
		justifyContent: "center",
		maxWidth: "30%",
		minWidth: 42,
		minHeight: 42,
		backgroundColor: colors.primaryVeryLight,
		borderColor: colors.primaryDark,
		borderWidth: 1,
		borderRadius: 6,
		padding: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		elevation: 1,
	},
	rideWaitTimeOpenText: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 21,
		fontWeight: "bold",
		color: colors.primaryDark,
	},
	rideWaitTimeMedium: {
		backgroundColor: colors.accentVeryLight,
		borderColor: colors.accentDark,
	},
	rideWaitTimeMediumText: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 21,
		fontWeight: "bold",
		color: colors.accentDark,
	},
	rideWaitTimeLong: {
		backgroundColor: "#EFCFFC",
		borderColor: "#550E71",
	},
	rideWaitTimeLongText: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 21,
		fontWeight: "bold",
		color: "#550E71",
	},
	rideWaitTimeClosed: {
		alignItems: "center",
		justifyContent: "center",
		maxWidth: "30%",
		minWidth: 42,
		minHeight: 42,
		resizeMode: "contain",
		marginLeft: 8,
		backgroundColor: colors.secondaryDark,
		borderRadius: 6,
		padding: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		elevation: 1,
	},

	rideWaitTimeMaintenance: {
		alignItems: "center",
		justifyContent: "center",
		maxWidth: "30%",
		minWidth: 42,
		minHeight: 42,
		resizeMode: "contain",
		marginLeft: 8,
		backgroundColor: colors.accent,
		borderRadius: 6,
		padding: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		elevation: 1,
	},
	rideWaitTimeClosedIce: {
		alignItems: "center",
		justifyContent: "center",
		maxWidth: "30%",
		minWidth: 42,
		minHeight: 42,
		resizeMode: "contain",
		marginLeft: 8,
		backgroundColor: "#A3EEF5",
		borderRadius: 6,
		padding: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		elevation: 1,
	},
	rideWaitTimeClosedWeather: {
		alignItems: "center",
		justifyContent: "center",
		maxWidth: "30%",
		minWidth: 42,
		minHeight: 42,
		resizeMode: "contain",
		marginLeft: 8,
		backgroundColor: "#B2CCFF",
		borderRadius: 6,
		padding: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		elevation: 1,
	},
});
