import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Constants from "expo-constants";
import { useAppConfig } from "@/src/hooks/api/useAppConfig";
import { isVersionBelow } from "@/src/utils/api/getAppConfig";
import { colors } from "@/src/styles";

const STORE_URL = "market://details?id=com.anonymous.airtimely";
const STORE_WEB_URL = "https://play.google.com/store/apps/details?id=com.anonymous.airtimely";

/**
 * Blocks the app when its version is below the API's `minAppVersion`.
 *
 * Old builds are not supported against the new API — this gate is what removes the
 * need for a compatibility layer. Until the config has loaded, or if it cannot be
 * fetched (offline), the app renders normally: the persisted cache still works, and
 * locking someone out over a network error would be worse than a stale screen.
 */
export function ForceUpdateGate({ children }: { children: React.ReactNode }) {
	const { data } = useAppConfig();
	const version = Constants.expoConfig?.version;

	if (!data || !version || !isVersionBelow(version, data.minAppVersion)) {
		return <>{children}</>;
	}

	const openStore = () => {
		Linking.openURL(STORE_URL).catch(() => Linking.openURL(STORE_WEB_URL));
	};

	return (
		<View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32, backgroundColor: colors.primaryVeryDark }}>
			<Text style={{ fontFamily: "Noto Sans", fontWeight: "700", fontSize: 20, color: colors.primaryVeryLight, textAlign: "center" }}>Update required</Text>
			<Text style={{ fontFamily: "Noto Sans", fontSize: 14, color: colors.primaryLight, textAlign: "center" }}>
				This version of Airtimely ({version}) is no longer supported. Please update to version {data.minAppVersion} or newer to keep seeing wait times.
			</Text>
			<Pressable accessibilityRole="button" onPress={openStore} style={({ pressed }) => ({ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, backgroundColor: pressed ? colors.primaryDark : colors.primaryLight })}>
				{({ pressed }) => <Text style={{ fontFamily: "Noto Sans", fontWeight: "700", color: pressed ? colors.primaryVeryLight : colors.primaryVeryDark }}>Update</Text>}
			</Pressable>
		</View>
	);
}
