// React / React Native Imports
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// Local Imports
import { Text, VStack, HStack, Pressable } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { colors } from "@/src/styles/styles";
import { getPinnedShowIds, addPinnedShowId, removePinnedShowId } from "@/src/utils/pinShows";
import { getShowTimes, type ShowTime } from "@/src/utils/api/getShowTimes";

// Helper function to format time (same as in parkInfo)
function formatTime(dateString: string): string {
	if (!dateString) return "";

	try {
		// Handle ISO format with timezone: "2025-03-10T17:20:00+01:00"
		const isoMatch = dateString.match(/T(\d{2}):(\d{2}):(\d{2})(?:[+-]\d{2}:\d{2}|Z)?/);
		if (isoMatch) {
			const [, hours, minutes] = isoMatch;
			return `${hours}:${minutes}`;
		}

		// Handle simple time format: "17:20:00" or "17:20"
		const timeMatch = dateString.match(/^(\d{1,2}):(\d{2})/);
		if (timeMatch) {
			const [, hours, minutes] = timeMatch;
			return `${hours.padStart(2, "0")}:${minutes}`;
		}

		return "Invalid time";
	} catch (error) {
		console.error("Error formatting time:", dateString, error);
		return "Invalid time";
	}
}

export const ShowItem = React.memo(function ShowItem({ id, name }: { id: string; name: string }) {
	const router = useRouter();
	const [isPinned, setIsPinned] = useState(false);
	const [showTimes, setShowTimes] = useState<ShowTime[]>([]);
	const [showTimesLoading, setShowTimesLoading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	// Load pinned status and show times on component mount
	useEffect(() => {
		const loadPinnedStatus = async () => {
			const pinnedIds = await getPinnedShowIds();
			setIsPinned(pinnedIds.includes(id));
		};

		const loadShowTimes = async () => {
			setShowTimesLoading(true);
			try {
				const showTimesData = await getShowTimes(id);
				if (showTimesData?.showTimes) {
					setShowTimes(showTimesData.showTimes);
				}
			} catch (error) {
				console.error("Error loading show times:", error);
			} finally {
				setShowTimesLoading(false);
			}
		};

		loadPinnedStatus();
		loadShowTimes();
	}, [id]);

	const handleTogglePin = useCallback(async () => {
		if (isPinned) {
			await removePinnedShowId(id);
			setIsPinned(false);
		} else {
			await addPinnedShowId(id);
			setIsPinned(true);
		}
	}, [id, isPinned]);

	// Get next show time
	const nextShowTime = useMemo(() => {
		if (!showTimes.length) return setStatus("closed");

		const now = new Date();
		const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

		return showTimes.find((showTime) => {
			const showTimeFormatted = formatTime(showTime.startTime);
			console.log(`Show: ${name} - Comparing show time: ${showTimeFormatted} with current time: ${currentTime}`);
			return showTimeFormatted > currentTime;
		});
	}, [showTimes]);

	const styling = useMemo(() => {
		const normalizedStatus = status?.toLowerCase();

		switch (normalizedStatus) {
			case "operating":
				return {
					containerColor: colors.primaryVeryDark,
					containerBorderColor: colors.primary,
					rideNameColor: colors.primaryWhite,
					statusContainerColor: colors.primaryDark,
					leftIconColor: colors.primaryLight,
					statusTextColor: colors.primaryVeryLight,
					statusBackgroundColor: colors.primaryVeryDark,
					statusBorderColor: colors.primaryLight,
					waitTimeTextColor: colors.primaryLight,
					vqIconColor: colors.primaryLight,
					vqTextColor: colors.primaryVeryLight,
					statusText: "Standby Wait",
				};
			case "closed":
				return {
					containerColor: colors.secondaryVeryDark,
					containerBorderColor: colors.secondary,
					rideNameColor: colors.secondaryVeryLight,
					statusContainerColor: colors.secondaryDark,
					leftIconColor: colors.secondaryVeryLight,
					statusTextColor: colors.secondaryVeryLight,
					statusBorderColor: colors.secondaryLight,
					statusBackgroundColor: colors.secondaryLight,
					statusIconColor: colors.secondaryBlack,
					statusText: "Closed",
				};
			default:
				return {
					containerColor: colors.primaryVeryDark,
					containerBorderColor: colors.primary,
					textColor: colors.primaryLight,
					headerColor: colors.primaryDark,
				};
		}
	}, [status]);

	const handlePress = useCallback(() => {
		router.push(`/attraction/${id}`);
	}, [router, id]);

	// Show times display component
	const showTimesDisplay = useMemo(() => {
		if (showTimesLoading) {
			return (
				<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
					<Icon name="clock" fill={colors.primaryLight} height={24} width={24} />
					<Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Loading Times...</Text>
				</HStack>
			);
		}

		if (!showTimes.length) {
			return (
				<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
					<Icon name="clock" fill={styling.leftIconColor} height={24} width={24} />
					<Text style={{ color: styling.statusTextColor, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>No Shows Today</Text>
				</HStack>
			);
		}

		if (nextShowTime) {
			return (
				<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
					<Icon name="clock" fill={styling.leftIconColor} height={24} width={24} />
					<Text style={{ color: styling.statusTextColor, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Next Show</Text>
					<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 50, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
						<Text style={{ color: colors.primaryLight, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{formatTime(nextShowTime.startTime)}</Text>
					</View>
				</HStack>
			);
		}

		// All shows for today have passed
		return (
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
				<Icon name="clock" fill={styling.leftIconColor} height={24} width={24} />
				<Text style={{ color: styling.statusTextColor, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Shows Ended</Text>
			</HStack>
		);
	}, [showTimes, showTimesLoading, nextShowTime, styling]);

	return (
		<VStack style={{ gap: 16, padding: 8, borderWidth: 1, borderColor: styling.containerBorderColor, backgroundColor: styling.containerColor, borderRadius: 6 }}>
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
				<Text style={{ flexShrink: 1, color: colors.primaryWhite, fontSize: 18, fontWeight: "bold" }}>{name}</Text>
				{!isPinned ? (
					<Pressable android_ripple={{ color: colors.primaryTransparent, foreground: true }} onPress={handleTogglePin} style={{ borderRadius: 8, overflow: "hidden" }}>
						<View style={{ padding: 6, backgroundColor: colors.primaryBlack, borderWidth: 2, borderColor: colors.primary, borderRadius: 8, overflow: "hidden" }}>
							<Icon name="favorite" fill={colors.primaryLight} height={21} width={21} />
						</View>
					</Pressable>
				) : (
					<Pressable android_ripple={{ color: colors.primaryTransparentDark, foreground: true }} onPress={handleTogglePin} style={{ borderRadius: 8, overflow: "hidden" }}>
						<View style={{ padding: 6, borderWidth: 2, borderColor: colors.primaryLight, backgroundColor: colors.primaryBlack, borderRadius: 8, overflow: "hidden" }}>
							<Icon name="favoriteFilled" fill={colors.primaryLight} height={21} width={21} />
						</View>
					</Pressable>
				)}
			</HStack>

			{/* Show Times Section */}
			{showTimesDisplay}
		</VStack>
	);
});
