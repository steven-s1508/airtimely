# windmill/ — Agent Guide

Windmill (self-hosted cron/workflow orchestrator) TypeScript scripts. Secrets via `Windmill.getVariable()`; DB access via the Supabase JS SDK. External API calls are rate-limited (ThemeParks Wiki API: 210ms between calls; Nominatim geocoding: 1000ms).

## `scheduled_functions/` (active jobs)

Pipeline order matters — each stage depends on the previous one having run:

1. `run_update_live_data.ts` (~every 5 min) — fetch live wait times per active park, insert into `ride_wait_times` (even null/no-data rows, tagged `NO_DATA`/`NO_EXTERNAL_ID`).
2. `run_hourly_by_timezone_aggregation.ts` (hourly) — groups rides by park timezone, calls `aggregate_hourly_ride_stats` for the correct previous hour *in that park's local time*.
3. `run_daily_from_hourly_aggregation.ts` (nightly) — ensures all 24 hours exist, calls `aggregate_daily_from_hourly` with cleanup (deletes raw + hourly rows after folding into `hourly_data` JSONB; keeps ~7 days raw as configured).
4. `run_monthly_aggregation.ts` (monthly) — calls `aggregate_monthly_ride_stats`.

Metadata sync jobs (independent of the above pipeline):

- `run_update_parks.ts` — syncs destinations/parks from ThemeParks API, geocodes country via Nominatim, supports dry-run.
- `run_update_park_schedules.ts` (daily) — syncs `parks_schedule` (operating hours/events) per park.
- `run_update_rides.ts` — diffs DB rides vs API by `external_id`; inserts new, updates changed, sets `is_active = false` for rides no longer in the API (never hard-deletes).

## `archive/`

Retired/one-off scripts kept for reference only — do not schedule or import from here. `run_update_park_operating_hours.ts` was superseded by `run_update_park_schedules.ts`.

## Conventions & gotchas

- **Runtime split**: these scripts run under Windmill, separate from `supabase/edge-functions/` (Deno/Supabase Edge Runtime). `run_update_live_data.ts` exists in *both* places — check which is actually scheduled/active before changing either, to avoid fixing the wrong copy.
- Timezone correctness is the most common source of bugs: always convert to the park's local timezone (luxon) before computing "hour"/"date" for aggregation — never use server/UTC hour directly.
- Preserve rate-limit delays (210ms ThemeParks, 1000ms Nominatim) — removing them risks hitting upstream API limits.
- New jobs should return a summary object (success/error/skipped counts) matching the style of existing jobs, for observability in Windmill's run history.
