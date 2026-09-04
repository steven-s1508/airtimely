import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Icon, type IconName } from "@/src/components/Icon";
import { colors } from "@/src/styles";

interface HeaderActionButtonProps {
	icon: IconName;
	label: string;
	onPress: () => void;
	disabled?: boolean;
	style?: StyleProp<ViewStyle>;
	children?: React.ReactNode;
}

export const HeaderActionButton = React.memo(function HeaderActionButton({ icon, label, onPress, disabled = false, style, children }: HeaderActionButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			onPress={onPress}
			disabled={disabled}
			android_ripple={{ color: colors.primaryTransparent, foreground: true }}
			style={[
				{
					backgroundColor: colors.primaryVeryDark,
					borderWidth: 1,
					borderColor: colors.primaryDark,
					borderRadius: 8,
					padding: 8,
					overflow: "hidden",
					opacity: disabled ? 0.6 : 1,
				},
				style,
			]}
		>
			{children ?? <Icon name={icon} fill={colors.primaryLight} height={24} width={24} />}
		</Pressable>
	);
});