// React / React Native Imports
import { View, Text, Pressable, ImageBackground, StyleSheet } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
// Expo Imports
import { Image } from "expo-image";
// Local Imports
import { styles, parkCardStyles } from "@/styles";
import { getParkImage } from "@/app/utils/images";
import { Park } from "@/app/types/park";

export interface ParkCardProps {
	id: string;
	name: string;
	land: string;
}

type RootStackParamList = { Park: { id: string; name: string } };
type HomeScreenNavigationProp = NavigationProp<RootStackParamList>;

export const ParkCard = ({ item: park }: { item: Park }) => {
	const navigation = useNavigation<HomeScreenNavigationProp>();

	return (
		<Pressable style={parkCardStyles.parkCardStyleOuter} android_ripple={{ color: "#fff", foreground: true }} onPress={() => navigation.navigate("Park", { id: park.id, name: park.name })}>
			<ImageBackground source={getParkImage(park.id)} resizeMode="cover" style={parkCardStyles.parkCardStyleInner}>
				<LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,1)"]} style={StyleSheet.absoluteFill} locations={[0.5, 0.95]} />
				<Text style={parkCardStyles.textParkNameStyle}>{park.name}</Text>
				<Text style={parkCardStyles.textTapToViewStyle}>Tap to view</Text>
			</ImageBackground>
		</Pressable>
	);
};
