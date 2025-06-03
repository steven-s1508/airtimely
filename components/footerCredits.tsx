import { View } from "react-native";
import { Text, Link, LinkText } from "@/components/ui";
import { styles } from "@/styles";

export const FooterCredits = () => (
	<View style={styles.footerCredits}>
		<Text style={styles.footerText}>Park and waiting time data kindly provided by:</Text>
		<Link href="https://waitingtimes.app">
			<LinkText style={styles.footerLink}>Waitingtimes.APP</LinkText>
		</Link>
	</View>
);
