# src/stores/ — Agent Guide

Zustand stores for durable client state (not server data — that's React Query's job, see `src/hooks/api/AGENTS.md`).

## Pattern

Both stores follow the same shape: `persist` middleware + `AsyncStorage` via `createJSONStorage`, with state and actions defined as separate interfaces combined into one type (`type Store = State & Actions`).

- **`pinnedItemsStore.ts`** — `pinnedAttractions`, `pinnedDestinations`, `pinnedShows`, `pinnedParks` arrays, each with idempotent `add`/`remove`/`isXPinned` actions (add is a no-op if already present, remove filters the array).
- **`preferencesStore.ts`** — simple UI preferences, e.g. `destinationSortBy: "name" | "country" | "status"`.

## Conventions

- New persisted state goes in one of these stores (or a new store following the same `persist`/`AsyncStorage` pattern) — don't introduce a different state library.
- Keep pin-toggle logic (add/remove/idempotency) in the store's actions, not scattered in components; UI-facing helpers that wrap these actions live in `src/utils/pinAttractions.ts`, `pinDestinations.ts`, `pinShows.ts`.
- Give each persisted store a distinct `name` key for AsyncStorage.
