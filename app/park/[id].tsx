// React / React Native Imports
import React from "react";
import { SafeAreaView, View, ActivityIndicator, ScrollView } from "react-native";
// Expo Imports
import { useLocalSearchParams } from "expo-router";
// 3rd Party Imports
import { Text, VStack, HStack, Pressable } from "@/src/components/ui";
// Local Imports
import { ParkHeader } from "@/src/components/parkHeader";
import { Icon } from "@/src/components/Icon";
import { colors, parkScreenStyles } from "@/src/styles/styles";
import { Scroll } from "lucide-react-native";
import { useRouter } from "expo-router";

function AttractionItem({ id, name, waitTime, status, singleRiderWaitTime, hasVirtualQueue }: { id: string; name: string; waitTime: number; status: string; singleRiderWaitTime: number; hasVirtualQueue: boolean }) {
	const router = useRouter();

	const virtualQueue = (
		<HStack style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 16, borderTopWidth: 1, borderBottomColor: colors.primaryVeryLight }}>
			<Icon name="virtualQueue" fill={colors.primaryLight} height={21} width={21} />
			<VStack>
				<Text style={{ color: colors.primaryLight, fontWeight: "bold", fontStyle: "italic", fontFamily: "Bebas Neue Pro, sans-serif" }}>Virtual Queue Options:</Text>
				<Text style={{ color: colors.primaryLight, fontWeight: 500, fontFamily: "Bebas Neue Pro, sans-serif" }}>Paid Return: 19:05 (13,00 €)</Text>
			</VStack>
		</HStack>
	);

	return (
		<VStack style={{ gap: 16, padding: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryVeryDark, borderRadius: 6 }}>
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
				<Text style={{ flexShrink: 1, color: colors.primaryLight, fontSize: 18, fontWeight: "bold" }}>{name}</Text>
				{/* <Pressable
					android_ripple={{ color: colors.primaryTransparent, foreground: true }}
					onPress={() => {
						console.log("Attraction statistics pressed");
						router.push({ pathname: "/park/[id]/ride/[id]", params: { id: id, name: name } });
					}}
					style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryVeryDark, borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 4, overflow: "hidden" }}
				>
					<Text style={{ color: colors.primaryLight }}>Stats</Text>
					<Icon name="stats" fill={colors.primaryLight} height={24} width={24} />
				</Pressable> */}
			</HStack>
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
				<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: colors.primaryDark }}>
					<Icon name="waitTime" fill={colors.primaryLight} height={24} width={24} />
					<Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Standby Wait</Text>
					{waitTime < 45 ? (
						<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryVeryDark, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: colors.primaryLight }}>
							<Text style={{ color: colors.primaryLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTime}</Text>
						</View>
					) : waitTime < 60 ? (
						<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: colors.accentDark, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: colors.accentLight }}>
							<Text style={{ color: colors.accentLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTime}</Text>
						</View>
					) : (
						<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: colors.highWaitingtimeVeryDark, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: colors.highWaitingtimeVeryLight }}>
							<Text style={{ color: colors.highWaitingtimeVeryLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTime}</Text>
						</View>
					)}
				</HStack>
				{singleRiderWaitTime !== undefined && (
					<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: colors.primaryDark }}>
						<Icon name="singleRider" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Single Rider</Text>
						{singleRiderWaitTime < 45 ? (
							<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryVeryDark, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: colors.primaryLight }}>
								<Text style={{ color: colors.primaryLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{singleRiderWaitTime}</Text>
							</View>
						) : singleRiderWaitTime < 60 ? (
							<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: colors.accentDark, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: colors.accentLight }}>
								<Text style={{ color: colors.accentLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{singleRiderWaitTime}</Text>
							</View>
						) : (
							<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: colors.highWaitingtimeVeryDark, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: colors.highWaitingtimeVeryLight }}>
								<Text style={{ color: colors.highWaitingtimeVeryLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{singleRiderWaitTime}</Text>
							</View>
						)}
					</HStack>
				)}
			</HStack>
			{hasVirtualQueue && virtualQueue}
		</VStack>
	);
}

export default function ParkScreen() {
	const params = useLocalSearchParams<{ id: string; name: string }>();
	const { id, name } = params;

	if (!id || !name) {
		// Optionally, render a loading state or an error message
		return <ActivityIndicator />;
	}

	/* const { data: openingTimes, isLoading: openingTimesLoading } = useParkOpeningTimes(id);
    const hasOpeningTimes = openingTimes && openingTimes.length > 0;
    const { data: rideWaitTimes, isLoading: rideWaitTimesLoading } = useRideWaitTimes(id); */

	return (
		<View style={parkScreenStyles.parkScreenContainer}>
			<ParkHeader id={id} name={name} />
			<VStack>
				{/* 3 Tabs Placeholder */}
				<HStack style={{ flexDirection: "row" }}>
					<Pressable android_ripple={{ color: colors.primaryTransparent }} onPress={() => console.log("Attractions pressed")} style={{ flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
						<Icon name="attraction" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight }}>Attractions</Text>
						<View style={{ width: 32, height: 4, backgroundColor: colors.primaryLight, borderRadius: 4 }} />
					</Pressable>
					<Pressable android_ripple={{ color: colors.primaryTransparent }} onPress={() => console.log("Shows pressed")} style={{ flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
						<Icon name="show" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight }}>Shows</Text>
						{/* <View style={{ width: 32, height: 4, backgroundColor: colors.primaryLight, borderRadius: 4 }} /> */}
					</Pressable>
					<Pressable android_ripple={{ color: colors.primaryTransparent }} onPress={() => console.log("Restaurants pressed")} style={{ flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
						<Icon name="restaurant" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight }}>Restaurants</Text>
						{/* <View style={{ width: 32, height: 4, backgroundColor: colors.primaryLight, borderRadius: 4 }} /> */}
					</Pressable>
				</HStack>
			</VStack>
			{/* Placeholder for park attractions list */}
			<SafeAreaView style={{ flex: 1 }}>
				<ScrollView>
					<VStack style={{ padding: 16, gap: 8 }}>
						<AttractionItem id="1" name="Space Mountain" status="Open" waitTime={45} />
						<AttractionItem id="2" name="Pirates of the Caribbean" status="Closed" waitTime={15} singleRiderWaitTime={5} />
						<AttractionItem id="3" name="Guardians of the Galaxy - Mission: BREAKOUT!" status="Open" waitTime={70} singleRiderWaitTime={55} />
						<AttractionItem id="4" name="Big Thunder Mountain Railroad" status="Open" waitTime={0} hasVirtualQueue />
						<AttractionItem id="5" name="It's a Small World" status="Open" waitTime={10} />
					</VStack>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}
