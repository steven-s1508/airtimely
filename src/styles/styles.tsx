import { StyleSheet } from "react-native";
import { StatusBadge } from "../components/statusBadge";
import { S } from "@expo/html-elements";

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
	primaryTransparentDark: "#0E58586B",
	// Secondary colors
	secondaryWhite: "#F0F0F0",
	secondaryVeryLight: "#CCCCCC",
	secondaryLight: "#A8A8A8",
	secondary: "#868686",
	secondaryDark: "#545454",
	secondaryVeryDark: "#333333",
	secondaryBlack: "#101010",
	secondaryTransparent: "#A8A8A886",
	// Accent colors
	accentWhite: "#FFF0DB",
	accentVeryLight: "#FED293",
	accentLight: "#FDB44B",
	accent: "#FC9603",
	accentDark: "#B46B02",
	accentVeryDark: "#6C4001",
	accentBlack: "#241500",
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
	parkFilterInput: { position: "relative", borderWidth: 0, elevation: 1, color: colors.primaryVeryLight },
	parkFilterInputField: { borderWidth: 1, paddingVertical: 8, paddingLeft: 12, borderRadius: 6, borderColor: colors.primary, fontSize: 16, lineHeight: 19, paddingRight: 36, backgroundColor: colors.primaryVeryDark, color: colors.primaryVeryLight, elevation: 1 },
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
	container: {
		padding: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderRadius: 6,
	},
	containerOpen: {
		borderColor: colors.primary,
		backgroundColor: colors.primaryVeryDark,
	},
	containerClosed: {
		borderColor: colors.secondaryVeryDark,
		backgroundColor: colors.secondaryVeryDark,
	},
	containerInner: {
		flexDirection: "column",
		gap: 16,
	},
	metadata: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	titleContainer: {
		paddingBottom: 16,
		borderBottomWidth: 2,
	},
	titleContainerInner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginHorizontal: -8,
		paddingHorizontal: 8,
	},
	titleContainerPark: {
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
	nameContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	icon: {
		color: colors.primaryVeryLight,
	},
	iconClosed: {
		color: colors.secondaryVeryLight,
	},
	name: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 24,
		lineHeight: 27,
		fontWeight: "800",
		color: colors.primaryVeryLight,
	},
	nameClosed: {
		flexShrink: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 24,
		lineHeight: 27,
		fontWeight: "800",
		color: colors.secondaryVeryLight,
	},
	chevron: {
		width: 24,
		height: 24,
		tintColor: colors.primaryVeryLight,
	},
});

export const destinationParkChildrenStyles = StyleSheet.create({
	listContainer: {
		flexDirection: "column",
		gap: 8,
	},
	container: {
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
	containerOpen: {
		backgroundColor: colors.primaryDark,
		borderWidth: 2,
		borderColor: colors.primary,
	},
	containerClosed: {
		backgroundColor: colors.secondaryDark,
		borderWidth: 2,
		borderColor: colors.secondaryDark,
	},
	nameContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	name: {
		flexShrink: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 18,
		lineHeight: 21,
		fontWeight: "800",
		color: colors.primaryVeryLight,
	},
	nameClosed: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 18,
		fontWeight: "800",
		color: colors.secondaryVeryLight,
	},
});

export const destinationStatusBadgeStyles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 100,
		borderWidth: 1,
	},
	containerOpen: {
		borderColor: colors.primary,
	},
	containerClosed: {
		borderColor: colors.secondaryVeryLight,
	},
	iconOpen: {
		color: colors.primaryVeryLight,
	},
	iconClosed: {
		color: colors.secondaryVeryLight,
	},
	text: {
		fontFamily: "Noto Sans",
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
	},
	textOpen: {
		color: colors.primaryVeryLight,
	},
	textClosed: {
		color: colors.secondaryVeryLight,
	},
});

export const destinationCountryBadgeStyles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 100,
	},
	containerOpen: {
		backgroundColor: colors.primaryBlack,
	},
	containerClosed: {
		backgroundColor: colors.secondaryDark,
	},
	text: {
		fontFamily: "Noto Sans",
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
	},
	iconOpen: {
		color: colors.primaryVeryLight,
	},
	iconClosed: {
		color: colors.secondaryVeryLight,
	},
	textOpen: {
		color: colors.primaryVeryLight,
	},
	textClosed: {
		color: colors.secondaryVeryLight,
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
		/* marginBottom: 16, */
	},
	parkScreenCountryBadge: {
		backgroundColor: colors.primaryVeryDark,
	},
	parkScreenCountryBadgeClosed: {
		backgroundColor: colors.secondaryVeryDark,
	},
	parkScreenCountryBadgeText: {
		color: colors.primaryLight,
	},
	parkScreenCountryBadgeTextClosed: {
		color: colors.secondaryLight,
	},
	parkScreenCountryBadgeIcon: {
		color: colors.primaryLight,
	},
	parkScreenCountryBadgeIconClosed: {
		color: colors.secondaryLight,
	},
});

export const ridesListStyles = StyleSheet.create({});
