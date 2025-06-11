import { View, ViewStyle } from "react-native";
import { Text } from "./ui";
import { Icon } from "./Icon";
import { colors, destinationCountryBadgeStyles } from "@/src/styles/styles";

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

export function CountryBadge({ country, style, iconColor, textColor }: { country: string; style?: ViewStyle; iconColor?: string; textColor?: string }) {
	const countryName = countryNames[country] || country; // Fallback to the original code if not found

	return (
		<View className={`country-badge country-${country.toLowerCase().replace(" ", "-")}`} style={[destinationCountryBadgeStyles.countryBadgeContainer, style]}>
			<Icon name="mapPin" fill={iconColor || colors.primaryVeryLight} height={14} width={14} />
			<Text style={[destinationCountryBadgeStyles.countryBadgeText, { color: textColor || colors.primaryVeryLight }]}>{countryName}</Text>
		</View>
	);
}
