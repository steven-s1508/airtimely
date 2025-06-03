// React / React Native Imports
import React from "react";
import { Text, View, Pressable, ActivityIndicator } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
// Expo Imports
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// Gluestack UI Imports
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { VStack } from "@/components/ui/vstack";
// Local Imports
import { ParkHeader } from "@/components/parkHeader";
import { useParkOpeningTimes } from "../api/useParkOpeningTimes";
import { useRideWaitTimes } from "../api/useRideWaitTimes";
import { styles } from "@/styles/styles";
import { sortRidesByStatus } from "../utils/rideStatus";
import { waitTimeIcons } from "../utils/waitTimeIcons";
import { ParkOpeningTimes } from "@/components/parkOpeningTimes";
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

export default function ParkScreen({ route }: ParkScreenProps) {
	const { id, name } = route.params;

	const { data: openingTimes, isLoading: openingTimesLoading } = useParkOpeningTimes(id);
	const hasOpeningTimes = openingTimes && openingTimes.length > 0;
	const { data: rideWaitTimes, isLoading: rideWaitTimesLoading } = useRideWaitTimes(id);

	return (
		<View>
			<ParkHeader id={id} name={name} />
			<ParkOpeningTimes hasOpeningTimes={hasOpeningTimes} openToday={openToday} openingTime={openingTime} closingTime={closingTime} formatTime={formatTime} />
			{/* You can add more components here, like ParkOpeningTimesDisplay, RideList, etc. */}
			{/* Add your park details and components here */}
		</View>
	);
}
