import AsyncStorage from "@react-native-async-storage/async-storage";

const PINNED_DESTINATIONS_KEY = "pinnedDestinations";

export async function getPinnedDestinationIds(): Promise<string[]> {
	try {
		const jsonValue = await AsyncStorage.getItem(PINNED_DESTINATIONS_KEY);
		return jsonValue != null ? JSON.parse(jsonValue) : [];
	} catch (e) {
		console.error("Failed to load pinned destinations:", e);
		return [];
	}
}

export async function addPinnedDestinationId(id: string): Promise<string[]> {
	try {
		const currentPinnedIds = await getPinnedDestinationIds();
		if (!currentPinnedIds.includes(id)) {
			const newPinnedIds = [...currentPinnedIds, id];
			await AsyncStorage.setItem(PINNED_DESTINATIONS_KEY, JSON.stringify(newPinnedIds));
			return newPinnedIds;
		}
		return currentPinnedIds;
	} catch (e) {
		console.error("Failed to add pinned destination:", e);
		return [];
	}
}

export async function removePinnedDestinationId(id: string): Promise<string[]> {
	try {
		const currentPinnedIds = await getPinnedDestinationIds();
		const newPinnedIds = currentPinnedIds.filter((pinnedId) => pinnedId !== id);
		await AsyncStorage.setItem(PINNED_DESTINATIONS_KEY, JSON.stringify(newPinnedIds));
		return newPinnedIds;
	} catch (e) {
		console.error("Failed to remove pinned destination:", e);
		return [];
	}
}
