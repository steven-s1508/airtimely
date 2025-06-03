// React / React Native Imports
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Local Imports
import HomeScreen from "../screens/HomeScreen";
import ParkScreen from "../screens/ParkScreen";

const Stack = createNativeStackNavigator();

export default function Navigation() {
	return (
		// HomeScreen without the header bar
		// ParkScreen with the header bar
		// NavigationContainer is the root of the navigation tree
		<NavigationContainer>
			<Stack.Navigator initialRouteName="Home">
				<Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
				<Stack.Screen name="Park" component={ParkScreen} options={{ title: "Park View" }} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}
