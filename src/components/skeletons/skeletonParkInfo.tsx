import React from "react";
import { View } from "react-native";
import { colors } from "@/src/styles/styles";
import { Pressable, HStack, VStack } from "@components/ui";

export const SkeletonParkInfo = React.memo(function SkeletonParkInfo() {
	return (
		<>
			{/* Toggle button skeleton */}
			<Pressable
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
					marginHorizontal: 16,
					marginBottom: 8,
					backgroundColor: colors.primaryVeryDark,
					alignSelf: "center",
				}}
			>
				<View
					style={{
						height: 14,
						width: 60,
						backgroundColor: colors.primary,
						borderRadius: 2,
					}}
				/>
				<View
					style={{
						width: 16,
						height: 16,
						backgroundColor: colors.primary,
						borderRadius: 2,
					}}
				/>
			</Pressable>

			{/* Park info content skeleton */}
			<View
				style={{
					padding: 16,
					backgroundColor: colors.primaryVeryDark,
					borderRadius: 6,
					borderWidth: 1,
					borderColor: colors.primaryDark,
					marginHorizontal: 16,
					marginBottom: 8,
				}}
			>
				<VStack style={{ gap: 8 }}>
					{/* Operating Hours skeleton */}
					<HStack style={{ flexDirection: "row", justifyContent: "space-between" }}>
						<View
							style={{
								height: 16,
								width: 120,
								backgroundColor: colors.primary,
								borderRadius: 3,
							}}
						/>
						<View
							style={{
								height: 16,
								width: 80,
								backgroundColor: colors.primary,
								borderRadius: 3,
							}}
						/>
					</HStack>

					{/* Divider skeleton */}
					<View
						style={{
							height: 1,
							backgroundColor: colors.primaryDark,
						}}
					/>

					{/* Info Items skeleton */}
					<VStack style={{ gap: 8 }}>
						<View
							style={{
								height: 14,
								width: 80,
								backgroundColor: colors.primary,
								borderRadius: 3,
							}}
						/>
						<HStack style={{ flexDirection: "row", justifyContent: "space-between" }}>
							<View
								style={{
									height: 14,
									width: 100,
									backgroundColor: colors.primary,
									borderRadius: 3,
								}}
							/>
							<View
								style={{
									height: 14,
									width: 60,
									backgroundColor: colors.primary,
									borderRadius: 3,
								}}
							/>
						</HStack>
					</VStack>

					{/* Divider skeleton */}
					<View
						style={{
							height: 1,
							backgroundColor: colors.primaryDark,
						}}
					/>

					{/* Lightning Lane skeleton */}
					<VStack style={{ gap: 8 }}>
						<View
							style={{
								height: 14,
								width: 100,
								backgroundColor: colors.primary,
								borderRadius: 3,
							}}
						/>
						<VStack style={{ gap: 4 }}>
							<HStack style={{ flexDirection: "row", justifyContent: "space-between" }}>
								<View
									style={{
										height: 14,
										width: 80,
										backgroundColor: colors.primary,
										borderRadius: 3,
									}}
								/>
								<View
									style={{
										height: 14,
										width: 50,
										backgroundColor: colors.primary,
										borderRadius: 3,
									}}
								/>
							</HStack>
							<HStack style={{ flexDirection: "row", justifyContent: "space-between" }}>
								<View
									style={{
										height: 14,
										width: 90,
										backgroundColor: colors.primary,
										borderRadius: 3,
									}}
								/>
								<View
									style={{
										height: 14,
										width: 45,
										backgroundColor: colors.primary,
										borderRadius: 3,
									}}
								/>
							</HStack>
						</VStack>
					</VStack>
				</VStack>
			</View>
		</>
	);
});
