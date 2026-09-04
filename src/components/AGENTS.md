# src/components/ — Agent Guide

Reusable, domain-specific presentational components rendered by screens in `app/`.

## Structure

- Top level: flat, camelCase filenames for list items, badges, headers, pills (e.g. `attractionItem.tsx`, `destinationItem.tsx`, `parkHeader.tsx`, `statusBadge.tsx`, `waitTimePill.tsx`, `sortControl.tsx`, `footerCredits.tsx`, `countryBadge.tsx`). `Icon.tsx` is PascalCase (wraps the icon library) — an intentional exception.
- `charts/` — Victory-based chart components, named `<Purpose>.victory.tsx` (e.g. `HourlyAverageBarChart.victory.tsx`, `WaitTimeLineChart.victory.tsx`). Each maps to an aggregation level in the DB (hourly/daily/monthly/weekday stats) — keep chart names aligned with the stats table/JSONB shape they render.
- `skeletons/` — Loading placeholders, named `skeleton<ComponentName>.tsx`, mirroring the real component 1:1 (e.g. `skeletonParkHeader.tsx` for `parkHeader.tsx`). When adding a new data-driven component, add a matching skeleton.
- `ui/` — Vendored Gluestack-UI primitive library (one folder per primitive: `button/`, `card/`, `input/`, `modal/`, etc.), barrel-exported via `index.ts`. **Treat as vendor code** — don't hand-edit; regenerate/update via the Gluestack CLI (config in [gluestack-ui.config.json](../../gluestack-ui.config.json)).

## Styling

Components mix NativeWind `className` (Tailwind, mainly via `ui/` primitives) with raw `style={styles.x}` objects from `src/styles/styles.tsx` / `chartStyles.tsx`. Semantic color tokens (`bg-app`, `text-primary`, `ride-status-high-wait`, etc.) are CSS variables defined in [global.css](../../global.css) and mapped in [tailwind.config.js](../../tailwind.config.js) — add new semantic colors there rather than hardcoding hex values, so light/dark mode keeps working.
