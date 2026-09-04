# app/ — Agent Guide

Expo-router file-based routes. Screens are thin: they compose components from `src/components/`, call hooks from `src/hooks/api/`, and read/write Zustand stores from `src/stores/`. Business logic and data fetching belong outside `app/`, not inline in screens.

## Files

- `_layout.tsx` — Root layout. Wraps the app in `GluestackUIProvider` (color-scheme aware) and `PersistQueryClientProvider` (React Query + AsyncStorage persister). Sets global `QueryClient` defaults (`staleTime: 5min`, `retry: 1`, `refetchOnReconnect: true`, `refetchOnWindowFocus: false`). Wires `AppState` to React Query's `focusManager` so `refetchInterval` behaves correctly in background/foreground. Prefetches `parkChildren` for all pinned parks/destinations on mount. Declares explicit `Stack.Screen` routes — new routes must be added here too.
- `index.tsx` — Home screen: debounced (300ms) search/filter, sort control, pull-to-refresh, renders `<DestinationList>`.
- `park/[parkId].tsx` — Park detail screen. Validates the `id` param as a UUID (`isValidUUID`) before using it. Uses `useParkChildren`, renders a `SectionList` merging pinned status, with search filter and a last-updated timestamp (luxon).
- `park/[parkId]/ride/[rideId].tsx` — Ride detail screen (stats/charts for a single ride).

## Conventions

- Always validate dynamic route params (e.g. UUIDs) before using them in queries — don't trust `useLocalSearchParams` blindly.
- New nested routes require a matching `Stack.Screen` entry in `_layout.tsx`.
- Keep screens presentation/composition only — push data fetching into `src/hooks/api/` + `src/utils/api/`, and reusable UI into `src/components/`.
