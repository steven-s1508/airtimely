import { StyleSheet } from "react-native";
import { colors } from "./styles";

export const chartStyles = StyleSheet.create({
	chartContainer: {
		marginVertical: 8,
	},
	chartText: {
		color: colors.primaryVeryLight,
		fontSize: 16,
		fontWeight: 700,
		marginBottom: 8,
	},
	chartContainerLoading: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: colors.primaryVeryDark,
		borderRadius: 8,
		padding: 16,
	},
});
