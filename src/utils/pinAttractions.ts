import AsyncStorage from "@react-native-async-storage/async-storage";

const PINNED_ATTRACTIONS_KEY = "pinnedAttractions";

export async function getPinnedAttractionIds(): Promise<string[]> {
	try {
		const jsonValue = await AsyncStorage.getItem(PINNED_ATTRACTIONS_KEY);
		return jsonValue != null ? JSON.parse(jsonValue) : [];
	} catch (e) {
		console.error("Failed to load pinned attractions:", e);
		return [];
	}
}

export async function addPinnedAttractionId(id: string): Promise<string[]> {
	try {
		const currentPinnedIds = await getPinnedAttractionIds();
		if (!currentPinnedIds.includes(id)) {
			const newPinnedIds = [...currentPinnedIds, id];
			await AsyncStorage.setItem(PINNED_ATTRACTIONS_KEY, JSON.stringify(newPinnedIds));
			return newPinnedIds;
		}
		return currentPinnedIds;
	} catch (e) {
		console.error("Failed to add pinned attraction:", e);
		return [];
	}
}

export async function removePinnedAttractionId(id: string): Promise<string[]> {
	try {
		const currentPinnedIds = await getPinnedAttractionIds();
		const newPinnedIds = currentPinnedIds.filter((pinnedId) => pinnedId !== id);
		await AsyncStorage.setItem(PINNED_ATTRACTIONS_KEY, JSON.stringify(newPinnedIds));
		return newPinnedIds;
	} catch (e) {
		console.error("Failed to remove pinned attraction:", e);
		return [];
	}
}
