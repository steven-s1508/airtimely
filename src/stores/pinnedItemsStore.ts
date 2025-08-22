import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PinnedItemsState {
	pinnedAttractions: string[];
	pinnedDestinations: string[];
	pinnedShows: string[];
	pinnedParks: string[];
}

export const usePinnedItemsStore = create<PinnedItemsState>()(
	persist(
		(set, get) => ({
			pinnedAttractions: [],
			pinnedDestinations: [],
			pinnedShows: [],
			pinnedParks: [],

			addPinnedAttraction: (id: string) =>
				set((state) => ({
					pinnedAttractions: state.pinnedAttractions.includes(id) ? state.pinnedAttractions : [...state.pinnedAttractions, id],
				})),

			removePinnedAttraction: (id: string) =>
				set((state) => ({
					pinnedAttractions: state.pinnedAttractions.filter((itemId) => itemId !== id),
				})),

			isAttractionPinned: (id: string) => get().pinnedAttractions.includes(id),

			addPinnedDestination: (id: string) =>
				set((state) => ({
					pinnedDestinations: state.pinnedDestinations.includes(id) ? state.pinnedDestinations : [...state.pinnedDestinations, id],
				})),

			removePinnedDestination: (id: string) =>
				set((state) => ({
					pinnedDestinations: state.pinnedDestinations.filter((itemId) => itemId !== id),
				})),

			isDestinationPinned: (id: string) => get().pinnedDestinations.includes(id),

			addPinnedShow: (id: string) =>
				set((state) => ({
					pinnedShows: state.pinnedShows.includes(id) ? state.pinnedShows : [...state.pinnedShows, id],
				})),

			removePinnedShow: (id: string) =>
				set((state) => ({
					pinnedShows: state.pinnedShows.filter((itemId) => itemId !== id),
				})),

			isShowPinned: (id: string) => get().pinnedShows.includes(id),

			addPinnedPark: (id: string) =>
				set((state) => ({
					pinnedParks: state.pinnedParks.includes(id) ? state.pinnedParks : [...state.pinnedParks, id],
				})),

			removePinnedPark: (id: string) =>
				set((state) => ({
					pinnedParks: state.pinnedParks.filter((itemId) => itemId !== id),
				})),

			isParkPinned: (id: string) => get().pinnedParks.includes(id),
		}),
		{
			name: "pinned-items-storage",
			storage: createJSONStorage(() => AsyncStorage),
			version: 1, // important for migrations
			migrate: (persistedState: any, version: number) => {
				if (version === 0) {
					// If migrating from version 0, ensure new fields are initialized
					return {
						...persistedState,
						pinnedShows: persistedState.pinnedShows || [],
						pinnedParks: persistedState.pinnedParks || [],
						pinnedAttractions: persistedState.pinnedAttractions || [],
					};
				}
				return persistedState;
			},
		}
	)
);
