# supabase/ — Agent Guide

Postgres schema (via Supabase) for theme park data + wait time stats, plus one Edge Function. Detailed schema/function reference: see repo memory `/memories/repo/airtimely_database_comprehensive_summary.md` (agent memory) — this file is the on-disk equivalent for Claude Code and other tools without access to that memory store.

## Structure

- **`db-definitions/`** — one `.sql` file per table/view. Core entities: `chains` → `destinations` → `parks` → `rides`/`restaurants`/`shows` (with `show_times`). Stats tables: `ride_wait_times` (raw ingest, ~90 day retention) → `hourly_ride_statistics` → `daily_ride_statistics` (with `hourly_data` JSONB, kept indefinitely) → `monthly_ride_statistics`. Views: `park_operating_hours` (filtered `parks_schedule`), `displayable_destinations` (unified UI entity list).
- **`db-functions/`** — Postgres functions/triggers implementing the aggregation pipeline: `aggregate_hourly_ride_stats` → `aggregate_all_hourly_stats_for_date` → `aggregate_daily_from_hourly` (applies park-hours filtering — critical, see below) → `aggregate_monthly_ride_stats`. Also `is_park_open`, `trigger_set_timestamp` (auto `updated_at`), and repair utilities (`retroactively_fix_daily_stats_from_hourly_data`, `find_daily_stats_zero_avg_with_hourly_gt_zero`).
- **`patches/`** — dated, hand-applied SQL (run via Beekeeper/psql, numbered in apply order). `2026-09-18_02` fixes the daily park-hours filter (it shifted local hours by the park's UTC offset) and introduces `upsert_daily_from_hourly_json` (the one place that turns an `hourly_data` array into a daily row) and `aggregate_daily_for_park`; `_01` drops unused/duplicate indexes; `_03` recomputes historical daily rows from `hourly_data`; `2026-09-19_04` merges leftover hourly rows into their daily rows; `_05` makes wait statistics operating-only (hourly averages only from `OPERATING` samples, old after-hours/non-operating hours cleared from `hourly_data`, so charts can use every hour that has an `avg`); `_06` does the same for old days without a published schedule (usual opening window from the park's schedule history; all-zero days treated as closed). Files in `db-functions/` are reference copies — the latest patch touching a function is the source of truth.
- **`edge-functions/run_update_live_data.ts`** — Supabase Edge Function (**Deno runtime**, `jsr:` imports, manual UUID generation via `crypto.getRandomValues`). Fetches live wait times from the ThemeParks Wiki API and writes to `ride_wait_times`. Note this overlaps with `windmill/scheduled_functions/run_update_live_data.ts` — confirm which is the actually-deployed/active one before editing either (see [windmill/AGENTS.md](../windmill/AGENTS.md)).

## Critical assumptions — don't break these

1. `recorded_at_local` must be in the park's own timezone (not UTC, not device time) or all aggregations downstream are wrong.
2. `park_id` is never null on rides/restaurants/shows.
3. `external_id` is required for API sync; rows without it are manual entries and won't sync.
4. `is_active` controls which rows are touched by sync jobs.
5. After daily aggregation, `hourly_data` JSONB on `daily_ride_statistics` is the source of truth — raw/hourly rows may already be deleted (cleanup).
6. `aggregate_daily_from_hourly` filters by park operating hours — this is what prevents after-hours maintenance waits from inflating daily averages. Any change to schedule/timezone handling must preserve this filtering.

## Conventions

- New tables need a `.sql` file in `db-definitions/`, matching existing style (uuid PK, indexes on FK/lookup columns, `trigger_set_timestamp` if it has `updated_at`).
- New aggregation logic belongs in `db-functions/`, called from a Windmill job (or edge function) — don't do heavy aggregation client-side.
