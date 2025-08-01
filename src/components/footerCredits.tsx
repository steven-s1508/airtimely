import React from "react";
import { View } from "react-native";
import { Text, Link, LinkText } from "@/src/components/ui";
import { styles } from "@/src/styles";

export const FooterCredits = React.memo(function FooterCredits() {
	return (
		<View style={styles.footerCredits}>
			<Text style={styles.footerText}>Park and waiting time data kindly provided by:</Text>
			<Link href="https://themeparks.wiki">
				<LinkText style={styles.footerLink}>ThemeParks.wiki</LinkText>
			</Link>
		</View>
	);
});
