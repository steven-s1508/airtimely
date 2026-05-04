import React from "react";
import { View } from "react-native";
import { colors, tokens } from "@/src/styles/styles";
import { HStack, VStack } from "@components/ui";

export const SkeletonAttractionItem = React.memo(function SkeletonAttractionItem() {
	return (
		<VStack style={{ gap: tokens.gap.card, borderWidth: 1, borderColor: colors.primaryDark, backgroundColor: colors.primaryVeryDark, borderRadius: tokens.radius.sm, overflow: "hidden", padding: 10 }}>
			<HStack style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
				<View
					style={{
						flex: 1,
						height: 24,
						backgroundColor: colors.primaryDark,
						borderRadius: 4,
					}}
				/>
				<View
					style={{
						width: 24,
						height: 24,
						backgroundColor: colors.primaryDark,
						borderRadius: 12,
					}}
				/>
			</HStack>

			<HStack style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
				<View
					style={{
						flex: 1,
						height: 40,
						backgroundColor: colors.primaryDark,
						borderRadius: 4,
					}}
				/>
				<View
					style={{
						flex: 1,
						height: 40,
						backgroundColor: colors.primaryDark,
						borderRadius: 4,
					}}
				/>
			</HStack>
		</VStack>
	);
});
