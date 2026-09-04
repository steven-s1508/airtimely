# src/hooks/api/ — Agent Guide

React Query hooks, one file per hook, thin wrappers around fetcher functions in `../../utils/api/`. This pair (`src/hooks/api/use*.ts` + `src/utils/api/get*.ts`) is the only sanctioned path from UI to Supabase — components must not call Supabase directly.

## Pattern

```ts
export function useParkStatus(parkId: string) {
  return useQuery<ParkStatus>({
    queryKey: ["parkStatus", parkId],
    queryFn: () => getParkStatus(parkId),
    enabled: !!parkId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}
```

- `queryKey`: array of `[domainString, ...ids]`. When an id is an array, sort it first (e.g. `destinationIds.sort()`) for a stable cache key.
- `enabled`: guard on required params (e.g. `!!parkId`, `ids.length > 0`) so queries don't fire with invalid input.
- Cache tuning (`staleTime`/`refetchInterval`/`gcTime`) should match data volatility — match existing hooks as a reference rather than reinventing:
  - live/status data (`useParkStatus`): 5 min staleTime + refetchInterval
  - semi-static lists (`useDestinations`, `useChildParks`, `useLiveStatuses`): 30 min staleTime/refetchInterval, 7 day gcTime
  - rarely-changing (`useParkSchedule`): 24h staleTime, no refetchInterval
- Return types are imported from the fetcher module itself (e.g. `ParkStatus` from `getParkStatus.ts`), not a separate types file — define the type alongside the fetcher, not in the hook.

## Existing hooks

`useDestinations`, `useChildParks`, `useParkChildren`, `useParkStatus`, `useParkSchedule`, `useLiveStatuses` — corresponding fetchers live in `../../utils/api/` (`getBulkParkStatus.ts`, `getParkChildren.ts`, `getParksByDestination.ts`, `getParkSchedule.ts`, `getParkStatus.ts`, `getRideStatistics.ts`).

When adding a new query: add the fetcher in `src/utils/api/` first (raw Supabase query, shaped/typed return), then wrap it here.
