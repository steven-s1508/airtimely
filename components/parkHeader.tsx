// React / React Native Imports
import React from "react";
import { Text, StyleSheet } from "react-native";
// Expo Imports
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
// Local Imports
import { getParkHeaderImage } from "../app/utils/images";

export function ParkHeader({ id, name }: { id: string; name: string }) {
	return (
		<ImageBackground source={getParkHeaderImage(id)} contentFit="cover" style={styles.header} key={id}>
			<LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,1)"]} style={StyleSheet.absoluteFill} locations={[0.5, 0.95]} />
			<Text style={styles.name}>{name}</Text>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	header: {
		height: 125,
		justifyContent: "flex-end",
		backgroundColor: "#f0f0f0",
		borderRadius: 12,
		marginVertical: 16,
		marginHorizontal: 16,
		padding: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		elevation: 2,
	},
	name: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#fff",
	},
});
