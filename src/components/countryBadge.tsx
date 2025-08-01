import React from "react";
import { View, ViewStyle } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationCountryBadgeStyles, parkScreenStyles } from "@/src/styles/styles";

// Convert country_code to a more readable format: e.g. "US" to "United States" or "DE" to "Germany".
// This is a simple mapping, you can expand it as needed.
const countryNames: Record<string, string> = {
	GB: "United Kingdom",
	US: "United States",
	BE: "Belgium",
	CA: "Canada",
	CN: "China",
	FR: "France",
	NL: "Netherlands",
	KR: "South Korea",
	DE: "Germany",
	DK: "Denmark",
	SE: "Sweden",
	IT: "Italy",
	ES: "Spain",
	MX: "Mexico",
	JP: "Japan",
};

export const CountryBadge = React.memo(function CountryBadge({ country, status, style, isPark }: { country: string; status: string; style?: ViewStyle; isPark?: boolean }) {
	if (!country || !status) {
		return null; // Return null if country or status is not provided
	}
	const countryName = countryNames[country] || country;

	let containerStyle = status.toLowerCase() === "open" ? destinationCountryBadgeStyles.containerOpen : destinationCountryBadgeStyles.containerClosed;
	let iconColor = status.toLowerCase() === "open" ? destinationCountryBadgeStyles.iconOpen.color : destinationCountryBadgeStyles.iconClosed.color;
	let textColor = status.toLowerCase() === "open" ? destinationCountryBadgeStyles.textOpen : destinationCountryBadgeStyles.textClosed;
	if (isPark) {
		containerStyle = status.toLowerCase() === "open" ? parkScreenStyles.parkScreenCountryBadge : parkScreenStyles.parkScreenCountryBadgeClosed;
		iconColor = status.toLowerCase() === "open" ? parkScreenStyles.parkScreenCountryBadgeIcon.color : parkScreenStyles.parkScreenCountryBadgeIconClosed.color;
		textColor = status.toLowerCase() === "open" ? parkScreenStyles.parkScreenCountryBadgeText : parkScreenStyles.parkScreenCountryBadgeTextClosed;
	}

	return (
		<View style={[destinationCountryBadgeStyles.container, containerStyle, style]}>
			<Icon name="mapPin" fill={iconColor} height={14} width={14} />
			<Text style={[destinationCountryBadgeStyles.text, textColor]}>{countryName}</Text>
		</View>
	);
});
