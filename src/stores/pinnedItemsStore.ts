import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PinnedItemsState {
	pinnedAttractions: string[];
	pinnedDestinations: string[];
	pinnedShows: string[];
	pinnedParks: string[];

	// Actions
	addPinnedAttraction: (id: string) => void;
	removePinnedAttraction: (id: string) => void;
	isAttractionPinned: (id: string) => boolean;

	addPinnedDestination: (id: string) => void;
	removePinnedDestination: (id: string) => void;
	isDestinationPinned: (id: string) => boolean;

	addPinnedShow: (id: string) => void;
	removePinnedShow: (id: string) => void;
	isShowPinned: (id: string) => boolean;

	addPinnedPark: (id: string) => void;
	removePinnedPark: (id: string) => void;
	isParkPinned: (id: string) => boolean;

	loadPinnedItems: () => Promise<void>;
}

export const usePinnedItemsStore = create<PinnedItemsState>()(
	persist(
		(set, get) => ({
			pinnedAttractions: [],
			pinnedDestinations: [],
			pinnedShows: [],
			pinnedParks: [],

			addPinnedAttraction: (id: string) => {
				set((state) => {
					const newPinnedAttractions = state.pinnedAttractions.includes(id) ? state.pinnedAttractions : [...state.pinnedAttractions, id];

					return { pinnedAttractions: newPinnedAttractions };
				});
			},

			removePinnedAttraction: (id: string) => {
				set((state) => {
					const newPinnedAttractions = state.pinnedAttractions.filter((itemId) => itemId !== id);
					return { pinnedAttractions: newPinnedAttractions };
				});
			},

			isAttractionPinned: (id: string) => {
				const isPinned = get().pinnedAttractions.includes(id);
				return isPinned;
			},

			addPinnedDestination: (id: string) => {
				set((state) => ({
					pinnedDestinations: state.pinnedDestinations.includes(id) ? state.pinnedDestinations : [...state.pinnedDestinations, id],
				}));
			},

			removePinnedDestination: (id: string) => {
				set((state) => ({
					pinnedDestinations: state.pinnedDestinations.filter((itemId) => itemId !== id),
				}));
			},

			isDestinationPinned: (id: string) => {
				return get().pinnedDestinations.includes(id);
			},

			addPinnedShow: (id: string) => {
				set((state) => ({
					pinnedShows: state.pinnedShows.includes(id) ? state.pinnedShows : [...state.pinnedShows, id],
				}));
			},

			removePinnedShow: (id: string) => {
				set((state) => ({
					pinnedShows: state.pinnedShows.filter((itemId) => itemId !== id),
				}));
			},

			isShowPinned: (id: string) => {
				return get().pinnedShows.includes(id);
			},

			addPinnedPark: (id: string) => {
				set((state) => ({
					pinnedParks: state.pinnedParks.includes(id) ? state.pinnedParks : [...state.pinnedParks, id],
				}));
			},

			removePinnedPark: (id: string) => {
				set((state) => ({
					pinnedParks: state.pinnedParks.filter((itemId) => itemId !== id),
				}));
			},

			isParkPinned: (id: string) => {
				return get().pinnedParks.includes(id);
			},

			loadPinnedItems: async () => {
				try {
					const storedState = await AsyncStorage.getItem("pinned-items-storage");

					if (storedState) {
						const parsedState = JSON.parse(storedState);

						if (parsedState && parsedState.state) {
							set({
								pinnedAttractions: parsedState.state.pinnedAttractions || [],
								pinnedDestinations: parsedState.state.pinnedDestinations || [],
								pinnedShows: parsedState.state.pinnedShows || [],
								pinnedParks: parsedState.state.pinnedParks || [],
							});
						} else {
							console.log("[PinnedItemsStore] No valid state found in storage");
						}
					} else {
						console.log("[PinnedItemsStore] No stored state found");
					}
				} catch (error) {
					console.error("[PinnedItemsStore] Error loading pinned items:", error);
				}
			},
		}),
		{
			name: "pinned-items-storage",
			storage: {
				getItem: async (name: string) => {
					const value = await AsyncStorage.getItem(name);
					if (value) {
						return JSON.parse(value);
					}
					return null;
				},
				setItem: async (name: string, value: any) => {
					await AsyncStorage.setItem(name, JSON.stringify(value));
				},
				removeItem: async (name: string) => {
					await AsyncStorage.removeItem(name);
				},
			},
		}
	)
);
