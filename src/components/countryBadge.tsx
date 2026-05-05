import React from "react";
import { View, ViewStyle } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationCountryBadgeStyles, parkScreenStyles } from "@/src/styles/styles";

// Convert country_code to a more readable format: e.g. "US" to "United States" or "DE" to "Germany".
// This is a simple mapping, you can expand it as needed.
const countryNames: Record<string, string> = {
	AE: "United Arab Emirates",
	AT: "Austria",
	AU: "Australia",
	BE: "Belgium",
	BR: "Brazil",
	CA: "Canada",
	CN: "China",
	DE: "Germany",
	DK: "Denmark",
	ES: "Spain",
	FI: "Finland",
	FR: "France",
	GB: "United Kingdom",
	HK: "Hong Kong",
	ID: "Indonesia",
	IE: "Ireland",
	IN: "India",
	IT: "Italy",
	JP: "Japan",
	KR: "South Korea",
	MX: "Mexico",
	MY: "Malaysia",
	NL: "Netherlands",
	NO: "Norway",
	PL: "Poland",
	PT: "Portugal",
	QA: "Qatar",
	SA: "Saudi Arabia",
	SE: "Sweden",
	SG: "Singapore",
	TH: "Thailand",
	TR: "Turkey",
	TW: "Taiwan",
	US: "United States",
	VN: "Vietnam",
};

export const CountryBadge = React.memo(function CountryBadge({ country, status, style, isPark }: { country: string; status: string; style?: ViewStyle; isPark?: boolean }) {
	if (!country || !status) {
		return null; // Return null if country or status is not provided
	}
	const countryName = countryNames[country] || country;

	let containerStyle = status.toLowerCase() === "open" ? destinationCountryBadgeStyles.containerOpen : destinationCountryBadgeStyles.containerClosed;
	let textColor = status.toLowerCase() === "open" ? destinationCountryBadgeStyles.textOpen : destinationCountryBadgeStyles.textClosed;
	if (isPark) {
		containerStyle = status.toLowerCase() === "open" ? parkScreenStyles.parkScreenCountryBadge : parkScreenStyles.parkScreenCountryBadgeClosed;
		textColor = status.toLowerCase() === "open" ? parkScreenStyles.parkScreenCountryBadgeText : parkScreenStyles.parkScreenCountryBadgeTextClosed;
	}

	return (
		<View style={[destinationCountryBadgeStyles.container, containerStyle, style]}>
			<Text style={[destinationCountryBadgeStyles.text, textColor]}>{countryName}</Text>
		</View>
	);
});
