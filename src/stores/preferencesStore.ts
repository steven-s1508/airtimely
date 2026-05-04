import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DestinationSortOption = "name" | "country" | "status";

interface PreferencesState {
	destinationSortBy: DestinationSortOption;
}

interface PreferencesActions {
	setDestinationSortBy: (sortBy: DestinationSortOption) => void;
}

type PreferencesStore = PreferencesState & PreferencesActions;

export const usePreferencesStore = create<PreferencesStore>()(
	persist(
		(set) => ({
			destinationSortBy: "name",
			setDestinationSortBy: (sortBy) => set({ destinationSortBy: sortBy }),
		}),
		{
			name: "preferences-storage",
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
