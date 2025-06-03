import { StyleSheet } from "react-native";

const PARK_CARD_HEIGHT = 182;
const PARK_CARD_MARGIN_BOTTOM = 16;
const TOTAL_PARK_CARD_HEIGHT = PARK_CARD_HEIGHT + PARK_CARD_MARGIN_BOTTOM;

export const colors = {
	// Primary colors
	primaryWhite: "#EDF8F8",
	primaryVeryLight: "#C9F3F3",
	primaryLight: "#88DDDD",
	primary: "#0E9898",
	primaryDark: "#0E5858",
	primaryVeryDark: "#072C2C",
	primaryBlack: "#031717",
	// Secondary colors
	secondaryWhite: "#F0F0F0",
	secondaryLight: "#BEBEBE",
	secondary: "#868686",
	secondaryDark: "#3F3F3F",
	secondaryBlack: "#101010",
	// Accent colors
	accentWhite: "#FDF8F1",
	accentVeryLight: "#FCE9CF",
	accentLight: "#F9C376",
	accent: "#FC9C12",
	accentDark: "#8F5019",
	accentVeryDark: "#301908",
	accentBlack: "#140B05",
	// Text colors
	textPrimary: "#031717",
	textSecondary: "#3F3F3F",
	textTertiary: "#868686",
	textAccent: "#FC9C12",
	// Background colors
	backgroundPrimary: "#fff",
	backgroundSecondary: "#333",
	backgroundAccent: "#FDF8F1",
	// Border colors
	borderLight: "#EEE",
	border: "#CCC",
	borderDark: "#AAA",
};

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		backgroundColor: colors.backgroundPrimary,
	},
	homeHeader: {
		flexDirection: "column",
		justifyContent: "center",
		padding: 16,
		gap: 16,
	},
	logo: { alignSelf: "center", width: 61, height: 40 },
	parkFilterInput: { position: "relative", marginBottom: 10, marginHorizontal: 16, borderWidth: 0, elevation: 1 },
	parkFilterInputField: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, borderColor: colors.primaryLight, fontSize: 16, lineHeight: 16, paddingRight: 36, backgroundColor: colors.primaryWhite, color: colors.primaryVeryDark, elevation: 1 },
	clearButton: { position: "absolute", right: 8, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 30 },
	footerCredits: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: colors.primaryVeryLight,
		borderTopWidth: 1,
		borderTopColor: colors.primaryLight,
		gap: 0,
	},
	footerText: {
		color: colors.primaryDark,
		fontSize: 12,
		textAlign: "center",
	},
	footerLink: {
		fontWeight: "bold",
		fontSize: 12,
		textAlign: "center",
	},
});

export const parksListStyles = StyleSheet.create({
	parksListContainer: {
		flex: 1,
		paddingHorizontal: 16,
	},
	parksViewSelectContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		paddingBottom: 16,
		borderBottomWidth: 2,
		borderBottomColor: colors.primaryVeryDark,
	},
	parksViewSelectLabel: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 16,
		color: colors.primaryBlack,
		fontWeight: "800",
	},
	parksViewSelect: {
		flex: 1,
	},
	selectTrigger: {
		position: "relative",
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.primaryLight,
		backgroundColor: colors.primaryWhite,
	},
	selectInput: {
		flex: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 14,
		lineHeight: 13,
	},
	parksListViewContainer: {
		flex: 1,
		gap: 16,
		paddingTop: 16,
	},
	countrySection: {
		flex: 1,
		flexDirection: "column",
		justifyContent: "flex-start",
		gap: 8,
	},
	countryNameText: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 21,
		fontWeight: "800",
		color: colors.primaryVeryDark,
	},
	parksListViewInnerContainer: {
		flex: 1,
	},
});

export const parkCardStyles = StyleSheet.create({
	parkCardStyleOuter: {
		width: "100%",
		height: PARK_CARD_HEIGHT,
		borderRadius: 12,
		overflow: "hidden",
		backgroundColor: colors.backgroundSecondary,
		marginBottom: PARK_CARD_MARGIN_BOTTOM,
	},
	parkCardStyleInner: {
		flexDirection: "column",
		flex: 1,
		height: "100%",
		padding: 16,
		justifyContent: "flex-end",
	},
	textParkNameStyle: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 27,
		fontWeight: "800",
		color: colors.primaryWhite,
	},
	textTapToViewStyle: {
		fontFamily: "Bebas Neue Pro",
		fontStyle: "italic",
		color: colors.textTertiary,
		marginTop: 4,
		fontSize: 13,
	},
});

export const ridesListStyles = StyleSheet.create({});
