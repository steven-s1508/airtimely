// React / React Native Imports
import React from "react";
import { View, Text, StyleSheet } from "react-native";
// Expo Imports
import { Image } from "expo-image";
// Local Imports
import { Ride } from "@/app/types/park";
import { RIDE_STATUS } from "@/app/constants/rideStatus";

interface RideListItemProps {
	item: Ride;
	waitTimeIcons: { [key: string]: any }; // Consider defining a more specific type for waitTimeIcons (e.g., Record<RideStatusType, ImageSourcePropType>)
	styles: StyleSheet.NamedStyles<any>; // Or a more specific style type based on ParkScreen's styles
}

export const RideListItem = React.memo(function RideListItem({ item, waitTimeIcons, styles }: RideListItemProps) {
	let statusView = null;
	// Use constants for status checks
	if (item.status === RIDE_STATUS.CLOSED) {
		statusView = (
			<View style={styles.rideWaitTimeClosed}>
				<Image source={waitTimeIcons.closed} style={{ width: 24, height: 24 }} contentFit="contain" />
			</View>
		);
	} else if (item.status === RIDE_STATUS.CLOSED_ICE) {
		statusView = (
			<View style={styles.rideWaitTimeClosedIce}>
				<Image source={waitTimeIcons.closedice} style={{ width: 24, height: 24 }} contentFit="contain" />
			</View>
		);
	} else if (item.status === RIDE_STATUS.CLOSED_WEATHER) {
		statusView = (
			<View style={styles.rideWaitTimeClosedWeather}>
				<Image source={waitTimeIcons.closedweather} style={{ width: 24, height: 24 }} contentFit="contain" />
			</View>
		);
	} else if (item.status === RIDE_STATUS.MAINTENANCE) {
		statusView = (
			<View style={styles.rideWaitTimeMaintenance}>
				<Image source={waitTimeIcons.maintenance} style={{ width: 24, height: 24 }} contentFit="contain" />
			</View>
		);
	} else if (item.status === RIDE_STATUS.OPENED) {
		const waitingTimeLength = (item: RideListItemProps) => {
			return {
				long: item.waitingtime > 61 ? "Long" : "Medium",
				medium: item.waitingtime > 31 ? "Medium" : "",
			};
		};
		statusView = (
			<View style={[styles.rideWaitTime, item.waitingtime > 61 ? styles.rideWaitTimeLong : item.waitingtime > 31 && item.waitingtime < 61 ? styles.rideWaitTimeMedium : styles.rideWaitTimeOpen]}>
				<Text style={[styles.rideWaitTimeOpenText, item.waitingtime > 61 ? styles.rideWaitTimeLongText : item.waitingtime > 31 && item.waitingtime < 61 ? styles.rideWaitTimeMediumText : styles.rideWaitTimeText]}>{item.waitingtime}</Text>
			</View>
		);
	}
	return (
		<View style={[styles.rideItem, item.status === RIDE_STATUS.CLOSED ? styles.rideItemClosed : item.status === RIDE_STATUS.MAINTENANCE ? styles.rideItemMaintenance : item.status === RIDE_STATUS.CLOSED_ICE ? styles.rideItemClosedIce : item.status === RIDE_STATUS.CLOSED_WEATHER ? styles.rideItemClosedWeather : {}]}>
			<Text style={[styles.rideName, item.status === RIDE_STATUS.CLOSED ? styles.rideNameClosed : item.status === RIDE_STATUS.MAINTENANCE ? styles.rideNameMaintenance : item.status === RIDE_STATUS.CLOSED_ICE ? styles.rideNameClosedIce : item.status === RIDE_STATUS.CLOSED_WEATHER ? styles.rideNameClosedWeather : styles.rideNameOpen]}>{item.name}</Text>
			{statusView}
		</View>
	);
});
