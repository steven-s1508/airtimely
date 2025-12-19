import React from "react";
import { View } from "react-native";
import { colors, parkScreenStyles } from "@/src/styles";
import { HStack, VStack } from "@components/ui";

export const SkeletonParkHeader = React.memo(function SkeletonParkHeader() {
	return (
		<VStack>
			{/* Header with back button, title, and refresh button */}
			<HStack style={parkScreenStyles.parkScreenHeaderContainer}>
				{/* Back button skeleton */}
				<View
					style={{
						width: 40,
						height: 40,
						backgroundColor: colors.primaryVeryDark,
						borderWidth: 1,
						borderColor: colors.primaryDark,
						borderRadius: 8,
					}}
				/>

				{/* Title skeleton */}
				<View
					style={{
						flex: 1,
						height: 24,
						backgroundColor: colors.primaryVeryDark,
						borderRadius: 4,
						marginHorizontal: 12,
					}}
				/>

				{/* Refresh button skeleton */}
				<View
					style={{
						width: 40,
						height: 40,
						backgroundColor: colors.primaryVeryDark,
						borderWidth: 1,
						borderColor: colors.primaryDark,
						borderRadius: 8,
					}}
				/>
			</HStack>

			{/* Metadata row with badges */}
			<HStack style={parkScreenStyles.parkScreenHeaderMetadata}>
				{/* Country badge skeleton */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 4,
						paddingVertical: 4,
						paddingLeft: 10,
						paddingRight: 12,
						borderRadius: 100,
						backgroundColor: colors.primaryVeryDark,
						width: 80,
						height: 28,
					}}
				/>

				{/* Status badge skeleton */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 4,
						paddingVertical: 2,
						paddingHorizontal: 8,
						borderRadius: 100,
						borderWidth: 1,
						borderColor: colors.primary,
						backgroundColor: colors.primaryVeryDark,
						width: 60,
						height: 24,
					}}
				/>
			</HStack>

			{/* Park info section skeleton */}
			<View
				style={{
					marginHorizontal: 16,
					marginBottom: 8,
				}}
			>
				{/* Park info toggle button skeleton */}
				<View
					style={{
						flexDirection: "row",
						justifyContent: "center",
						alignItems: "center",
						gap: 4,
						paddingHorizontal: 12,
						paddingVertical: 4,
						borderWidth: 1,
						borderColor: colors.primaryDark,
						borderRadius: 100,
						alignSelf: "center",
						backgroundColor: colors.primaryVeryDark,
						width: 120,
						height: 32,
					}}
				/>
			</View>
		</VStack>
	);
});
