import { StyleSheet } from "react-native";
import { StatusBadge } from "../components/statusBadge";

export const colors = {
	// Primary colors
	primaryWhite: "#EDF8F8",
	primaryVeryLight: "#C9F3F3",
	primaryLight: "#88DDDD",
	primary: "#0E9898",
	primaryDark: "#0E5858",
	primaryVeryDark: "#072C2C",
	primaryBlack: "#031717",
	primaryTransparent: "#88DDDD86",
	// Secondary colors
	secondaryWhite: "#F0F0F0",
	secondaryVeryLight: "#CCCCCC",
	secondaryLight: "#A8A8A8",
	secondary: "#868686",
	secondaryDark: "#545454",
	secondaryVeryDark: "#333333",
	secondaryBlack: "#101010",
	// Accent colors
	accentWhite: "#FDF8F1",
	accentVeryLight: "#FCE9CF",
	accentLight: "#F9C376",
	accent: "#FC9C12",
	accentDark: "#8F5019",
	accentVeryDark: "#301908",
	accentBlack: "#140B05",
	// High Waitingtime colors
	highWaitingtimeWhite: "#FCDDF0",
	highWaitingtimeVeryLight: "#F79AD2",
	highWaitingtimeLight: "#F256B4",
	highWaitingtime: "#ED1295",
	highWaitingtimeDark: "#A90D6B",
	highWaitingtimeVeryDark: "#650840",
	highWaitingtimeBlack: "#220315",
};

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "flex-start",
		backgroundColor: colors.primaryBlack,
	},
	homeHeader: {
		flexDirection: "column",
		justifyContent: "center",
		padding: 16,
		gap: 16,
	},
	logo: { alignSelf: "center", width: 61, height: 40 },
	parkFilterInput: { position: "relative", marginHorizontal: 16, borderWidth: 0, elevation: 1 },
	parkFilterInputField: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, borderColor: colors.primary, fontSize: 16, lineHeight: 16, paddingRight: 36, backgroundColor: colors.primaryVeryDark, color: colors.primaryLight, elevation: 1 },
	clearButton: { position: "absolute", right: 8, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 30 },
	footerCredits: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: colors.primaryVeryDark,
		borderTopWidth: 1,
		borderTopColor: colors.primaryLight,
		gap: 0,
	},
	footerText: {
		color: colors.primaryLight,
		fontSize: 12,
		textAlign: "center",
	},
	footerLink: {
		fontWeight: "bold",
		fontSize: 12,
		textAlign: "center",
		color: colors.primaryVeryLight,
	},
});

export const destinationListStyles = StyleSheet.create({
	destinationListContainer: {
		flexDirection: "column",
		gap: 16,
		paddingVertical: 16,
	},
});

export const destinationItemStyles = StyleSheet.create({
	destinationItemContainer: {
		padding: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: colors.primary,
		borderRadius: 6,
		backgroundColor: colors.primaryVeryDark,
	},
	destinationItemContainerInner: {
		flexDirection: "column",
		gap: 16,
	},
	destinationItemMetadata: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	destinationTitleContainer: {
		paddingBottom: 16,
		borderBottomWidth: 2,
		borderBottomColor: colors.primaryDark,
	},
	destinationTitleContainerInner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginHorizontal: -8,
		paddingHorizontal: 8,
	},
	destinationTitleContainerPark: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginHorizontal: -8,
		paddingHorizontal: 8,
		marginVertical: -4,
		paddingVertical: 4,
		borderRadius: 8,
		overflow: "hidden",
	},
	destinationNameContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	destinationIcon: {
		width: 24,
		height: 24,
		tintColor: colors.primaryVeryLight,
	},
	destinationName: {
		flexShrink: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 24,
		lineHeight: 27,
		fontWeight: "800",
		color: colors.primaryVeryLight,
	},
	destinationChevron: {
		width: 24,
		height: 24,
		tintColor: colors.primaryVeryLight,
	},
});

export const destinationParkChildrenStyles = StyleSheet.create({
	parkChildListContainer: {
		flexDirection: "column",
		gap: 8,
	},
	parkChildContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: colors.primaryDark,
		borderWidth: 2,
		borderColor: colors.primary,
		overflow: "hidden",
	},
	parkChildContainerOpen: {
		backgroundColor: colors.primaryDark,
		borderWidth: 2,
		borderColor: colors.primary,
	},
	parkChildContainerClosed: {
		backgroundColor: colors.secondaryDark,
		borderWidth: 2,
		borderColor: colors.secondaryDark,
	},
	parkChildNameContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	parkChildName: {
		flexShrink: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 18,
		lineHeight: 21,
		fontWeight: "800",
		color: colors.primaryVeryLight,
	},
	parkChildNameClosed: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 18,
		fontWeight: "800",
		color: colors.secondaryVeryLight,
	},
});

export const destinationStatusBadgeStyles = StyleSheet.create({
	statusBadgeContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	statusBadgeIcon: {
		width: 14,
		height: 14,
	},
	statusBadgeText: {
		fontFamily: "Noto Sans",
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
		color: colors.primaryVeryLight,
	},
});

export const destinationCountryBadgeStyles = StyleSheet.create({
	countryBadgeContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 100,
		backgroundColor: colors.primaryBlack,
	},
	countryBadgeIcon: {
		width: 14,
		height: 14,
	},
	countryBadgeText: {
		fontFamily: "Noto Sans",
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
		color: colors.primaryVeryLight,
	},
});

export const skeletonDestinationItemStyles = StyleSheet.create({
	destinationItemContainer: {
		width: "100%",
		padding: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: colors.primary,
		borderRadius: 6,
		backgroundColor: colors.primaryVeryDark,
	},
	destinationItemContainerInner: {
		flexDirection: "column",
		gap: 16,
	},
	destinationItemMetadata: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	statusBadge: {
		width: 60,
		height: 20,
		backgroundColor: colors.primary,
	},
	countryBadge: {
		width: 60,
		height: 20,
		backgroundColor: colors.primary,
	},
	destinationTitleContainer: {
		paddingBottom: 16,
		borderBottomWidth: 2,
		borderBottomColor: colors.primaryDark,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginHorizontal: -8,
		paddingHorizontal: 8,
	},
	destinationNameContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	destinationIcon: {
		width: 24,
		height: 24,
		tintColor: colors.primaryVeryLight,
	},
	destinationName: {
		flexShrink: 1,
		width: "100%",
		height: 24,
		backgroundColor: colors.primary,
		borderRadius: 4,
	},
	destinationChevron: {
		width: 24,
		height: 24,
		tintColor: colors.primaryVeryLight,
	},
});

export const parkScreenStyles = StyleSheet.create({
	parkScreenContainer: {
		flex: 1,
		backgroundColor: colors.primaryBlack,
	},
	parkScreenHeaderContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
	},
	parkScreenHeaderTitle: {
		flex: 1,
		fontSize: 24,
		fontWeight: "bold",
		color: colors.primaryVeryLight,
		marginHorizontal: 8,
	},
	parkScreenHeaderMetadata: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		paddingHorizontal: 16,
		marginBottom: 16,
	},
	parkScreenCountryBadge: {
		backgroundColor: colors.primaryVeryDark,
	},
});

export const ridesListStyles = StyleSheet.create({});
