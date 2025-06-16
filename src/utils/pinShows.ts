import AsyncStorage from "@react-native-async-storage/async-storage";

const PINNED_SHOWS_KEY = "pinnedShows";

export const getPinnedShowIds = async (): Promise<string[]> => {
	try {
		const pinnedShows = await AsyncStorage.getItem(PINNED_SHOWS_KEY);
		return pinnedShows ? JSON.parse(pinnedShows) : [];
	} catch (error) {
		console.error("Error loading pinned shows:", error);
		return [];
	}
};

export const addPinnedShowId = async (showId: string): Promise<void> => {
	try {
		const currentPinned = await getPinnedShowIds();
		if (!currentPinned.includes(showId)) {
			const updatedPinned = [...currentPinned, showId];
			await AsyncStorage.setItem(PINNED_SHOWS_KEY, JSON.stringify(updatedPinned));
		}
	} catch (error) {
		console.error("Error adding pinned show:", error);
	}
};

export const removePinnedShowId = async (showId: string): Promise<void> => {
	try {
		const currentPinned = await getPinnedShowIds();
		const updatedPinned = currentPinned.filter((id) => id !== showId);
		await AsyncStorage.setItem(PINNED_SHOWS_KEY, JSON.stringify(updatedPinned));
	} catch (error) {
		console.error("Error removing pinned show:", error);
	}
};

export const clearPinnedShows = async (): Promise<void> => {
	try {
		await AsyncStorage.removeItem(PINNED_SHOWS_KEY);
	} catch (error) {
		console.error("Error clearing pinned shows:", error);
	}
};
