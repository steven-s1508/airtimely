import { StyleSheet } from "react-native";

export const base = {
	primary: {
		50: "#010808",
		100: "#031e1e",
		200: "#053535",
		300: "#085454",
		400: "#0b7272",
		500: "#0e9898",
		600: "#4ab2b2",
		700: "#7ac6c6",
		800: "#9fd6d6",
		900: "#c3e5e5",
		950: "#e7f5f5",
	},
	secondary: {
		50: "#070707",
		100: "#1b1b1b",
		200: "#2f2f2f",
		300: "#4a4a4a",
		400: "#656565",
		500: "#868686",
		600: "#a4a4a4",
		700: "#bcbcbc",
		800: "#cfcfcf",
		900: "#e1e1e1",
		950: "#f3f3f3",
	},
	accent: {
		50: "#0d0800",
		100: "#321e01",
		200: "#583501",
		300: "#8b5302",
		400: "#bd7102",
		500: "#fc9603",
		600: "#fdb042",
		700: "#fdc574",
		800: "#fed59a",
		900: "#fee5c0",
		950: "#fff5e6",
	},
	highWaitTime: {
		50: "#0c0107",
		100: "#2f041e",
		200: "#530634",
		300: "#820a52",
		400: "#b20e70",
		500: "#ed1295",
		600: "#f24db0",
		700: "#f57dc5",
		800: "#f8a0d5",
		900: "#fbc4e5",
		950: "#fde7f4",
	},
	error: {
		50: "#0d0203",
		100: "#32090b",
		200: "#580f13",
		300: "#8a181e",
		400: "#bc2129",
		500: "#fb2c36",
		600: "#fc6168",
		700: "#fd8b90",
		800: "#fdabaf",
		900: "#fecacd",
		950: "#ffeaeb",
	},
	success: {
		50: "#000a04",
		100: "#002810",
		200: "#00461c",
		300: "#006f2c",
		400: "#00973c",
		500: "#00c950",
		600: "#40d77c",
		700: "#73e19f",
		800: "#99e9b9",
		900: "#bff2d3",
		950: "#e6faee",
	}
};

export const colors = {
	bg: {
		app: base.primary[50],
		disabled: base.secondary[700],
	},
	text: {
		primary: base.primary[900],
		closed: base.secondary[800],
		muted: base.primary[700],
		disabled: base.secondary[600],
		onDisabled: base.secondary[400],
	},
	card: {
		bg: {
			open: base.primary[50],
			closed: base.secondary[50],
		},
		border: {
			open: base.primary[600],
			closed: base.secondary[300],
		},
		pressable: {
			open: base.primary[100],
			openPressed: base.primary[200],
			closed: base.secondary[100],
			pressedClosed: base.secondary[200],
		},
	},
	favorite: {
		bg: {
			default: base.primary[200],
			pressed: base.primary[300],
			pinned: base.primary[300],
			pinnedPressed: base.primary[400],
		},
		icon: {
			default: base.primary[800],
			pinned: base.accent[600],
		},
	},
	parkStatus: {
		bg: {
			open: base.primary[600],
			closed: base.secondary[300],
		},
		onBg: {
			open: base.primary[50],
			closed: base.secondary[950],
		},
	},
	rideStatus: {
		bg: {
			highWait: base.highWaitTime[100],
			mediumWait: base.accent[100],
			lowWait: base.primary[100],
			closed: base.secondary[300],
			maintenance: base.accent[200],
		},
		border: {
			highWait: base.highWaitTime[500],
			mediumWait: base.accent[500],
			lowWait: base.primary[500],
			closed: base.secondary[500],
			maintenance: base.accent[700],
		},
		onBg: {
			highWait: base.highWaitTime[900],
			mediumWait: base.accent[700],
			lowWait: base.primary[900],
			closed: base.secondary[900],
			maintenance: base.accent[900],
		},
	},
	ui: {
		border: base.primary[200],
	},
	light: {

	},
	

	
	// Primary colors
	primaryWhite: "#EDF8F8",
	primaryVeryLight: "#C9F3F3",
	primaryLight: "#88DDDD",
	/* primary: "#0E9898", */
	primaryDark: "#0D5454",
	primaryVeryDark: "#062323",
	primaryBlack: "#010909",
	primaryTransparent: "#88DDDD86",
	primaryTransparentDark: "#0D54546B",
	// Secondary colors
	secondaryWhite: "#FAFAFA",
	secondaryVeryLight: "#D9D9D9",
	secondaryLight: "#B8B8B8",
	/* secondary: "#868686", */
	secondaryDark: "#474747",
	secondaryVeryDark: "#262626",
	secondaryBlack: "#050505",
	secondaryTransparent: "#B8B8B886",
	// Accent colors
	accentWhite: "#FFF4E5",
	accentVeryLight: "#FED293",
	accentLight: "#FDB44B",
	/* accent: "#FC9603", */
	accentDark: "#AB6602",
	accentVeryDark: "#5A3602",
	accentBlack: "#0F0900",
	// High Waitingtime colors
	highWaitingtimeWhite: "#FCDDF0",
	highWaitingtimeVeryLight: "#F79AD2",
	highWaitingtimeLight: "#F256B4",
	highWaitingtime: "#ED1295",
	highWaitingtimeDark: "#A90D6B",
	highWaitingtimeVeryDark: "#650840",
	highWaitingtimeBlack: "#220315",
};

export const tokens = {
	font: {
		primary: "Bebas Neue Pro",
		secondary: "Noto Sans",
	},
	gap: {
		card: 8,
	},
	radius: {
		sm: 4,
		md: 6,
		lg: 8,
		xl: 12,
	},
};

export const styles = StyleSheet.create({
	app: {
		backgroundColor: colors.bg.app,
		flex: 1,
	},
	
	/* container: {
		flex: 1,
		justifyContent: "flex-start",
		backgroundColor: colors.secondaryBlack,
	}, */
	homeHeader: {
		flexDirection: "column",
		justifyContent: "center",
		padding: 16,
		gap: 16,
	},
	logo: { 
		alignSelf: "center", 
		width: 61, 
		height: 40 
	},
	parkFilterInput: { 
		position: "relative", 
		borderWidth: 0, 
		elevation: 1, 
		color: base.primary[900], 
	},
	parkFilterInputField: { 
		borderWidth: 1, 
		paddingVertical: 8, 
		paddingLeft: 12, 
		borderRadius: 6, 
		borderColor: base.primary[300], 
		fontSize: 16, lineHeight: 19, 
		paddingRight: 36, 
		backgroundColor: colors.primaryVeryDark, 
		color: colors.primaryVeryLight, 
		elevation: 1
	},
	attractionFilterInput: {
		position: "relative",
		borderWidth: 0,
		elevation: 1,
		color: base.primary[900],
		marginHorizontal: 16,
		marginBottom: 16
	},
	attractionFilterInputField: {
		borderWidth: 1,
		paddingVertical: 8,
		paddingLeft: 12,
		borderRadius: 6,
		borderColor: base.primary[300],
		fontSize: 16, lineHeight: 19,
		paddingRight: 36,
		backgroundColor: colors.primaryVeryDark,
		color: colors.primaryVeryLight,
		elevation: 1
	},
	clearButton: {
		position: "absolute",
		right: 8,
		top: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
		width: 30
	},
	footerCredits: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: colors.primaryVeryDark,
		borderTopWidth: 1,
		borderTopColor: colors.primaryLight,
		gap: 0,
	},
	footerText: {
		color: colors.text.primary,
		fontSize: 12,
		textAlign: "center",
	},
	footerLink: {
		fontWeight: "bold",
		fontSize: 12,
		textAlign: "center",
		color: colors.text.primary,
	},
});

export const cardStyles = StyleSheet.create({
	default: {
		marginBottom: 16,
		borderWidth: 1,
		borderRadius: tokens.radius.sm,
		gap: tokens.gap.card,
		overflow: "hidden"
	},
	isPark: {
		gap: 4,
	},
	cardOpen: {
		backgroundColor: colors.card.bg.open,
		borderColor: colors.card.border.open,
	},
	cardClosed: {
		backgroundColor: colors.card.bg.closed,
		borderColor: colors.card.border.closed,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	cardTitle: {
		fontFamily: tokens.font.primary,
		fontSize: 21,
		lineHeight: 24,
		fontWeight: "800",
	},
	cardTitleOpen: {
		color: colors.text.primary,
	},
	cardTitleClosed: {
		color: colors.text.closed,
	},
	cardBody: {
		flex: 1,
		flexDirection: "column",
		gap: 8,
		paddingHorizontal: 8,
		paddingTop: 8,
		paddingBottom: 10,
	},
	title: {
		color: colors.text.primary,
	},
	titleClosed: {
		color: colors.text.closed,
	},
	pressableDestination: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 4,
		paddingVertical: 8,
		paddingLeft: 8,
		paddingRight: 4,
		borderRadius: 4,
		overflow: "hidden",
	},
	pressableDestinationPressed: {
		backgroundColor: colors.card.pressable.openPressed,
	},
	pressableDestinationClosedPressed: {
		backgroundColor: colors.card.pressable.pressedClosed,
	},
	parksContainer: {
		flex: 1,
		flexDirection: "column",
		gap: 8,
	},
	pressablePark: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 4,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: colors.card.border.open,
		borderRadius: 6,
		overflow: "hidden",
		backgroundColor: colors.card.pressable.open,
	},
	pressableParkPressed: {
		backgroundColor: colors.card.pressable.openPressed,
	},
	pressableParkClosed: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 4,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: colors.card.border.closed,
		borderRadius: 6,
		overflow: "hidden",
		backgroundColor: colors.card.pressable.closed,
	},
	pressableParkClosedPressed: {
		backgroundColor: colors.card.pressable.pressedClosed
	},
	pressableParkText: {
		fontFamily: tokens.font.primary,
		fontSize: 18,
		lineHeight: 21,
		fontWeight: "800",
		color: colors.text.primary,
	},
	pressableParkTextClosed: {
		color: colors.text.closed,
	}
});

export const favoriteButtonStyles = StyleSheet.create({
	container: {
		height: 32,
		width: 32,
		padding: 6,
		borderBottomLeftRadius: tokens.radius.md,
		overflow: "hidden",
		backgroundColor: colors.favorite.bg.default,
	},
	pinned: {
		backgroundColor: colors.favorite.bg.pinned,
	},
	icon: {
		color: colors.favorite.icon.default,
	},
	iconPinned: {
		color: colors.favorite.icon.pinned,
	},
	pressed: {
		backgroundColor: colors.favorite.bg.pressed,
	},
	pinnedPressed: {
		backgroundColor: colors.favorite.bg.pinnedPressed,
	},

});

export const parkStatusStyles = StyleSheet.create({
	destination: {
		alignItems: "center",
		justifyContent: "center",
		height: 32,
		width: 32,
		borderBottomRightRadius: tokens.radius.md,
		overflow: "hidden",
	},
	park: {
		alignItems: "center",
		justifyContent: "center",
		height: 18,
		width: 18,
		borderRadius: 100,
	},
	open: {
		backgroundColor: colors.parkStatus.bg.open,
	},
	closed: {
		backgroundColor: colors.parkStatus.bg.closed,
	},
	iconOpen: {
		color: colors.parkStatus.onBg.open,
	},
	iconClosed: {
		color: colors.parkStatus.onBg.closed,
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
	containerClosed: {
		borderColor: colors.secondaryVeryDark,
		backgroundColor: colors.card.bg.closed,
	},
	containerInner: {
		flexDirection: "column",
		gap: 8,
	},
	metadata: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start",
		gap: 8,
	},
	titleContainer: {},
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
		marginVertical: -4,
		paddingLeft: 8,
		paddingRight: 4,
		paddingVertical: 8,
		borderRadius: 4,
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
		flexShrink: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 21,
		lineHeight: 24,
		fontWeight: "800",
		color: colors.primaryVeryLight,
	},
	nameClosed: {
		flexShrink: 1,
		fontFamily: "Bebas Neue Pro",
		fontSize: 21,
		lineHeight: 24,
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
		borderRadius: 6,
		backgroundColor: colors.primaryDark,
		borderWidth: 1,
		borderColor: base.accent[500],
		overflow: "hidden",
	},
	containerOpen: {
		backgroundColor: colors.primaryVeryDark,
		borderWidth: 1,
		borderColor: base.primary[500],
	},
	containerClosed: {
		backgroundColor: colors.secondaryDark,
		borderWidth: 1,
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
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "800",
		color: colors.primaryVeryLight,
	},
	nameClosed: {
		fontFamily: "Bebas Neue Pro",
		fontSize: 14,
		fontWeight: "800",
		color: colors.secondaryVeryLight,
	},
});

export const destinationStatusBadgeStyles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingVertical: 2,
		paddingHorizontal: 2,
		borderRadius: 100,
	},
	containerOpen: {
		backgroundColor: colors.primaryLight,
	},
	containerClosed: {
		backgroundColor: colors.secondaryLight,
		paddingVertical: 2,
		paddingHorizontal: 2,
	},
	iconOpen: {
		color: colors.primaryBlack,
	},
	iconClosed: {
		color: colors.secondaryBlack,
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
		paddingVertical: 2,
		paddingHorizontal: 10,
		borderRadius: 100,
	},
	containerOpen: {
		backgroundColor: colors.parkStatus.bg.open,
	},
	containerClosed: {
		backgroundColor: colors.parkStatus.bg.closed,
	},
	text: {
		fontFamily: "Noto Sans",
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
	},
	textOpen: {
		color: colors.parkStatus.onBg.open,
	},
	textClosed: {
		color: colors.parkStatus.onBg.closed,
	},
});

export const skeletonDestinationItemStyles = StyleSheet.create({
	container: {
		width: "100%",
		marginBottom: 16,
		borderWidth: 1,
		borderColor: base.primary[200],
		borderRadius: tokens.radius.sm,
		backgroundColor: colors.card.bg.open,
	},
	containerInner: {
		flexDirection: "column",
		gap: 16,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	statusBadge: {
		width: 32,
		height: 32,
		borderBottomRightRadius: tokens.radius.md,
		overflow: "hidden",
		backgroundColor: colors.parkStatus.bg.open,
	},
	countryBadge: {
		width: 60,
		height: 20,
		borderRadius: 100,
		backgroundColor: colors.parkStatus.bg.open,
	},
	favoriteButton: {
		width: 32,
		height: 32,
		borderBottomLeftRadius: tokens.radius.md,
		backgroundColor: colors.favorite.bg.default,
	},
	body: {
		flexDirection: "column",
		gap: 8,
	},
	titleContainer: {
		width: "60%",
		height: 24,
		borderRadius: 4,
	},
	titleBar: {
		width: "100%",
		height: 16,
		borderRadius: 4,
		backgroundColor: base.primary[200],
	},
	
});

export const parkScreenStyles = StyleSheet.create({
	parkScreenContainer: {
		flex: 1,
		backgroundColor: colors.primaryBlack,
	},
	parkScreenHeaderContainer: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		padding: 16,
		paddingBottom: 8,
	},
	parkScreenHeaderTitle: {
		flex: 1,
		fontSize: 24,
		fontWeight: "bold",
		color: colors.primaryVeryLight,
		marginHorizontal: 12,
	},
	parkScreenHeaderMetadata: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	parkScreenCountryBadge: {
		backgroundColor: colors.parkStatus.bg.open,
	},
	parkScreenCountryBadgeClosed: {
		backgroundColor: colors.parkStatus.bg.closed,
	},
	parkScreenCountryBadgeText: {
		color: colors.parkStatus.onBg.open,
	},
	parkScreenCountryBadgeTextClosed: {
		color: colors.parkStatus.onBg.closed,
	},
});

export const ridesListStyles = StyleSheet.create({});

export const rideItemStyles = StyleSheet.create({
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
		flexShrink: 1,
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
});

export const rideScreenStyles = StyleSheet.create({
	rideScreenContainer: {
		flex: 1,
		backgroundColor: colors.primaryBlack,
	},
	rideScreenHeaderContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		paddingBottom: 8,
	},
	rideScreenHeaderTitle: {
		flex: 1,
		fontSize: 24,
		fontWeight: "bold",
		color: colors.primaryVeryLight,
		marginHorizontal: 12,
	},
	rideScreenHeaderMetadata: {
		flexDirection: "column",
		gap: 8,
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	rideScreenCountryBadge: {
		backgroundColor: colors.primaryVeryDark,
	},
	rideScreenCountryBadgeClosed: {
		backgroundColor: colors.secondaryVeryDark,
	},
	rideScreenCountryBadgeText: {
		color: colors.primaryLight,
	},
	rideScreenCountryBadgeTextClosed: {
		color: colors.secondaryLight,
	},
	rideScreenCountryBadgeIcon: {
		color: colors.primaryLight,
	},
	rideScreenCountryBadgeIconClosed: {
		color: colors.secondaryLight,
	},
});

export const rideStatusBadgeStyles = StyleSheet.create({
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
	containerDown: {
		borderColor: "#A3000E",
	},
	containerRefurbishment: {
		borderColor: colors.secondaryVeryLight,
	},
	iconOpen: {
		color: colors.primaryVeryLight,
	},
	iconClosed: {
		color: colors.secondaryVeryLight,
	},
	iconDown: {
		color: "#A3000E",
	},
	iconRefurbishment: {
		color: colors.secondaryVeryLight,
	},
	text: {
		fontFamily: "Noto Sans",
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
		textTransform: "capitalize",
	},
	textOpen: {
		color: colors.primaryVeryLight,
	},
	textClosed: {
		color: colors.secondaryVeryLight,
	},
	textDown: {
		color: colors.secondaryVeryLight,
	},
	textRefurbishment: {
		color: colors.secondaryVeryLight,
	},
});
