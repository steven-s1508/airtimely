# supabase/ — Agent Guide

Postgres schema (via Supabase) for theme park data + wait time stats, plus one Edge Function. Detailed schema/function reference: see repo memory `/memories/repo/airtimely_database_comprehensive_summary.md` (agent memory) — this file is the on-disk equivalent for Claude Code and other tools without access to that memory store.

## Structure

- **`db-definitions/`** — one `.sql` file per table/view. Core entities: `chains` → `destinations` → `parks` → `rides`/`restaurants`/`shows` (with `show_times`). Stats tables: `ride_wait_times` (raw ingest, ~90 day retention) → `hourly_ride_statistics` → `daily_ride_statistics` (with `hourly_data` JSONB, kept indefinitely) → `monthly_ride_statistics`. Views: `park_operating_hours` (filtered `parks_schedule`), `displayable_destinations` (unified UI entity list).
- **`db-functions/`** — Postgres functions/triggers implementing the aggregation pipeline: `aggregate_hourly_ride_stats` → `aggregate_all_hourly_stats_for_date` → `aggregate_daily_from_hourly` (applies park-hours filtering — critical, see below) → `aggregate_monthly_ride_stats`. Also `is_park_open`, `trigger_set_timestamp` (auto `updated_at`), and repair utilities (`retroactively_fix_daily_stats_from_hourly_data`, `find_daily_stats_zero_avg_with_hourly_gt_zero`).
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
