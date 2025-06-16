// React / React Native Imports
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { View } from "react-native";
// Expo Imports
import { useRouter } from "expo-router";
// Local Imports
import { Text, VStack, HStack, Pressable } from "@/src/components/ui";
import { Icon } from "@/src/components/Icon";
import { colors } from "@/src/styles/styles";
import { getPinnedAttractionIds, addPinnedAttractionId, removePinnedAttractionId } from "@/src/utils/pinAttractions";

export const AttractionItem = React.memo(function AttractionItem({ id, name, waitTime, status, singleRiderWaitTime, hasVirtualQueue }: { id: string; name: string; waitTime?: number; status?: string; singleRiderWaitTime?: number; hasVirtualQueue?: boolean }) {
	const router = useRouter();
	const [isPinned, setIsPinned] = useState(false);

	// Load pinned status on component mount
	useEffect(() => {
		const loadPinnedStatus = async () => {
			const pinnedIds = await getPinnedAttractionIds();
			setIsPinned(pinnedIds.includes(id));
		};
		loadPinnedStatus();
	}, [id]);

	const handleTogglePin = useCallback(async () => {
		if (isPinned) {
			await removePinnedAttractionId(id);
			setIsPinned(false);
		} else {
			await addPinnedAttractionId(id);
			setIsPinned(true);
		}
	}, [id, isPinned]);

	const virtualQueue = (
		<HStack style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 16, borderTopWidth: 1, borderBottomColor: colors.primaryVeryLight }}>
			<Icon name="virtualQueue" fill={colors.primaryLight} height={21} width={21} />
			<VStack>
				<Text style={{ color: colors.primaryLight, fontWeight: "bold", fontStyle: "italic", fontFamily: "Bebas Neue Pro, sans-serif" }}>Virtual Queue Options:</Text>
				<Text style={{ color: colors.primaryLight, fontWeight: 500, fontFamily: "Bebas Neue Pro, sans-serif" }}>Paid Return: 19:05 (13,00 €)</Text>
			</VStack>
		</HStack>
	);

	const waitTimeStyles = useMemo(() => {
		const displayWaitTime = waitTime ?? 0;

		if (displayWaitTime < 45) {
			return {
				statusBackgroundColor: colors.primaryVeryDark,
				statusBorderColor: colors.primaryLight,
				waitTimeTextColor: colors.primaryLight,
			};
		} else if (displayWaitTime < 60) {
			return {
				statusBackgroundColor: colors.accentVeryDark,
				statusBorderColor: colors.accentLight,
				waitTimeTextColor: colors.accentLight,
			};
		} else {
			return {
				statusBackgroundColor: colors.highWaitingtimeVeryDark,
				statusBorderColor: colors.highWaitingtimeVeryLight,
				waitTimeTextColor: colors.highWaitingtimeVeryLight,
			};
		}
	}, [waitTime]);

	const singleRiderWaitTimeStyles = useMemo(() => {
		const displaySingleRiderWaitTime = singleRiderWaitTime ?? 0;

		if (displaySingleRiderWaitTime < 45) {
			return {
				statusBackgroundColor: colors.primaryVeryDark,
				statusBorderColor: colors.primaryLight,
				waitTimeTextColor: colors.primaryLight,
			};
		} else if (displayWaitTime < 60) {
			return {
				statusBackgroundColor: colors.accentVeryDark,
				statusBorderColor: colors.accentLight,
				waitTimeTextColor: colors.accentLight,
			};
		} else {
			return {
				statusBackgroundColor: colors.highWaitingtimeVeryDark,
				statusBorderColor: colors.highWaitingtimeVeryLight,
				waitTimeTextColor: colors.highWaitingtimeVeryLight,
			};
		}
	}, [singleRiderWaitTime]);

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
					statusBackgroundColor: waitTimeStyles.statusBackgroundColor,
					statusBorderColor: waitTimeStyles.statusBorderColor,
					waitTimeTextColor: waitTimeStyles.waitTimeTextColor,
					vqIconColor: colors.primaryLight,
					vqTextColor: colors.primaryVeryLight,
					statusText: "Standby Wait",
				};
			case "down":
				return {
					containerColor: "#211213",
					containerBorderColor: "#A3000E",
					rideNameColor: "#FFCCD9",
					statusContainerColor: "#3D1215",
					leftIconColor: "#FFCCD9",
					statusTextColor: "#FFCCD9",
					statusBorderColor: "#A3000E",
					statusBackgroundColor: "#FFCCD9",
					statusIconColor: "#A3000E",
					statusText: "Down",
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
			case "refurbishment":
				return {
					containerColor: colors.accentBlack,
					containerBorderColor: colors.accent,
					rideNameColor: colors.accentVeryLight,
					statusContainerColor: colors.accentVeryDark,
					leftIconColor: colors.accentLight,
					statusTextColor: colors.accentLight,
					statusBorderColor: colors.accent,
					statusBackgroundColor: colors.accent,
					statusIconColor: colors.accentBlack,
					statusText: "Refurbishment",
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

	// Default wait time to 0 if not provided (for shows/restaurants)
	const displayWaitTime = waitTime ?? 0;
	const displaySingleRiderWaitTime = singleRiderWaitTime;

	const statusView = (waitType = "standby") =>
		useMemo(() => {
			const normalizedStatus = status?.toLowerCase();

			// Determine the wait time to display based on wait type
			let waitTimeToDisplay;
			if (waitType === "standby") {
				waitTimeToDisplay = displayWaitTime;
			} else if (waitType === "singleRider") {
				waitTimeToDisplay = displaySingleRiderWaitTime ?? 0;
			}

			if (normalizedStatus === "operating" || normalizedStatus === "open") {
				return (
					<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: waitType === "singleRider" ? singleRiderWaitTimeStyles.statusBackgroundColor : styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: waitType === "singleRider" ? singleRiderWaitTimeStyles.statusBorderColor : styling.statusBorderColor }}>
						<Text style={{ color: waitType === "singleRider" ? singleRiderWaitTimeStyles.waitTimeTextColor : styling.waitTimeTextColor, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTimeToDisplay}</Text>
					</View>
				);
			} else if (normalizedStatus === "down") {
				return (
					<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
						<Icon name="down" fill={styling.statusIconColor} height={24} width={24} />
					</View>
				);
			} else if (normalizedStatus === "closed") {
				return (
					<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
						<Icon name="closed" fill={styling.statusIconColor} height={24} width={24} />
					</View>
				);
			} else if (normalizedStatus === "refurbishment") {
				return (
					<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
						<Icon name="refurbishment" fill={styling.statusIconColor} height={24} width={24} />
					</View>
				);
			}

			// Default case - show wait time
			return (
				<View style={{ alignItems: "center", justifyContent: "center", backgroundColor: styling.statusBackgroundColor, padding: 4, minWidth: 36, minHeight: 32, borderWidth: 1, borderRadius: 4, borderColor: styling.statusBorderColor }}>
					<Text style={{ color: styling.waitTimeTextColor, textAlign: "center", fontSize: 14, lineHeight: 16, fontWeight: "bold" }}>{waitTimeToDisplay}</Text>
				</View>
			);
		}, [status, displayWaitTime, styling, waitTimeStyles, displaySingleRiderWaitTime, waitType]);

	return (
		<VStack style={{ gap: 16, padding: 8, borderWidth: 1, borderColor: styling.containerBorderColor, backgroundColor: styling.containerColor, borderRadius: 6 }}>
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
				<Text style={{ flexShrink: 1, color: styling.rideNameColor, fontSize: 18, fontWeight: "bold" }}>{name}</Text>
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
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
				<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
					<Icon name="waitTime" fill={styling.leftIconColor} height={24} width={24} />
					<Text style={{ color: styling.statusTextColor, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>{styling.statusText}</Text>
					{statusView("standby")}
				</HStack>
				{displaySingleRiderWaitTime !== undefined && (
					<HStack style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 6, borderRadius: 6, backgroundColor: styling.statusContainerColor }}>
						<Icon name="singleRider" fill={colors.primaryLight} height={24} width={24} />
						<Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "800", fontFamily: "Bebas Neue Pro" }}>Single Rider</Text>
						{statusView("singleRider")}
					</HStack>
				)}
			</HStack>
			{hasVirtualQueue && virtualQueue}
		</VStack>
	);
});
