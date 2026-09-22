# src/hooks/api/ — Agent Guide

React Query hooks, one file per hook (or per screen area), thin wrappers around fetcher functions in `../../utils/api/`. This pair (`src/hooks/api/use*.ts` + `src/utils/api/get*.ts`) is the only sanctioned path from UI to the Airtimely API — components must not call `api` / `fetch` directly.

## Pattern

```ts
export function useParkStatus(parkId: string) {
  return useQuery<ParkStatus>({
    queryKey: queryKeys.parkStatus(parkId),
    queryFn: () => getParkStatus(parkId),
    enabled: !!parkId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}
```

- `queryKey`: always from `src/utils/queryKeys.ts`, never an inline array.
- `enabled`: guard on required params (e.g. `!!parkId`) so queries don't fire with invalid input.
- Cache tuning (`staleTime`/`refetchInterval`/`gcTime`) should match data volatility — match existing hooks rather than reinventing:
  - live data (`useParkChildren`, `useParkStatus`, `useLiveRideStatistics`): 5 min staleTime + refetchInterval
  - home cards (`useDestinations`): 30 min staleTime/refetchInterval, 7 day gcTime
  - historical aggregates (`useHourlyAverageWaitTimes`, `useWeekdayAverageWaitTimes`, `useMonthlyAverageWaitTimes`, `useWeekdayAverageWaitTimesByYear`): 1 h staleTime, 7 day gcTime — they change once a night
  - rarely-changing (`useParkSchedule`): 24 h staleTime, no refetchInterval
- Keep gcTime ≤ 7 days: the persister's `maxAge` in `app/_layout.tsx` is 7 days.
- Return types come from the fetcher module (e.g. `ParkStatus` from `getParkStatus.ts`), not a separate types file.

## Fetchers (`src/utils/api/`)

- `client.ts` exports `api`, a Hono `hc<AppType>` client typed end to end from the server (`import type { AppType } from "airtimely-server"`), and `readJson`, which throws on non-2xx so React Query retries and keeps the last good data.
- Payload types are inferred, not hand-written: `InferResponseType<typeof api.v1.home.$get, 200>`. A server change that breaks the app is a `tsc` error.
- The API is screen-shaped. Several hooks may read slices of one endpoint under their own keys and tiers — `useParkChildren`, `useParkStatus` and `useParkSchedule` all come from `/v1/parks/:id` via `getPark()`. The client shares concurrent identical GETs, so this costs one request.
- Fetchers do only light reshaping for the components (capitalised status, Monday-first weekdays, nulls → 0 for bar charts). Aggregation belongs on the server — never pull rows to the phone to average them.

## Existing hooks

`useDestinations`, `useParkChildren`, `useParkStatus`, `useParkSchedule`, `useAppConfig`, and in `useRideStatistics.ts`: `useLiveRideStatistics`, `useHourlyAverageWaitTimes`, `useWeekdayAverageWaitTimes`, `useWeekdayAverageWaitTimesByYear`, `useMonthlyAverageWaitTimes`.

When adding a new query: add or extend the endpoint in `server/src/api/`, rebuild the server (`npm --workspace server run build`) so `AppType` updates, add the fetcher in `src/utils/api/`, then wrap it here. If a persisted payload's shape changes, bump `CACHE_GENERATION` in `app/_layout.tsx`.
