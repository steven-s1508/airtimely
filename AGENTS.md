# Airtimely — Agent Guide

Airtimely is an Expo/React Native (Android-focused) app showing live theme park wait times, backed by its own API in `server/`: a read-only Hono API and a croner worker over Postgres 18 that polls and aggregates the ThemeParks Wiki API.

This file covers repo-wide context. More specific `AGENTS.md` files exist in subfolders — check them when working in that area:

- [app/AGENTS.md](app/AGENTS.md) — expo-router routes/screens
- [src/components/AGENTS.md](src/components/AGENTS.md) — components, charts, skeletons, ui/ primitives
- [src/hooks/api/AGENTS.md](src/hooks/api/AGENTS.md) — data-fetching pattern (hooks + utils/api)
- [src/stores/AGENTS.md](src/stores/AGENTS.md) — Zustand client state
- [server/AGENTS.md](server/AGENTS.md) — backend: Hono API, croner worker, Postgres 18 schema, statistics semantics

## Tech stack

- Expo 55 / React Native 0.83 / React 19, `expo-router` (file-based routing), Android-only (`app.json` platforms).
- Styling: NativeWind v4 (Tailwind for RN) + Gluestack-UI component library, plus a parallel hand-rolled `src/styles/` (StyleSheet-based). Dark mode via `darkMode: "class"` and CSS vars in [global.css](global.css).
- State: Zustand (+ AsyncStorage persist) for client state; TanStack React Query (+ AsyncStorage persister) for all server state. Do not mix the two.
- Backend: the app talks only to the v2 API in `server/` (Hono + Postgres 18); payload types are inferred from its `AppType` via Hono's `hc`. `server/` is an npm workspace of the root package; see [server/AGENTS.md](server/AGENTS.md).
- Dates/timezones: `luxon` everywhere. The server stores true UTC instants and derives park-local dates and hours from each park's `timezone`; park-local vs UTC is a critical, recurring distinction — never assume server/device timezone.

## Commands

- `npm start` — expo start
- `npm run android` / `npm run ios` / `npm run web` — run on platform (`DARK_MODE=media`)
- `npm run generate-icons` — convert SVGs in `src/assets/icons/` to typed RN components via svgr

## Path aliases

Defined in **both** [tsconfig.json](tsconfig.json) and [babel.config.js](babel.config.js) (module-resolver) — keep them in sync when adding new aliases: `@/*`, `@components/*`, `@src/*`, `@assets/*`, `@styles/*`, `@utils/*`, `@types/*`, `@constants/*`.

## Conventions

- TypeScript `strict: true`. Don't loosen this.
- Naming: camelCase filenames for components/hooks/utils (`parkHeader.tsx`, `useParkStatus.ts`, `getParkChildren.ts`). PascalCase only for a few special cases (`Icon.tsx`).
- Import ordering in screens/components follows comment-grouped sections: `// React / React Native Imports`, `// Expo Imports`, `// 3rd Party Imports`, `// Local Imports`.
- Data fetching is layered: `src/utils/api/get*.ts` (typed `hc` call to the API) → `src/hooks/api/use*.ts` (React Query wrapper) → components. Don't call the API directly from components.
- `src/components/ui/` is vendored Gluestack-UI code — avoid hand-editing; regenerate via the Gluestack CLI instead.
