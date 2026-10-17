# server/ — Agent Guide

The Airtimely backend (`airtimely-server`, an npm workspace of the root package): a read-only Hono API and a croner worker over Postgres 18. One image, two Coolify containers, chosen by `APP_ROLE=api|worker`. Both run pending migrations on startup ([src/main.ts](src/main.ts)).

[README.md](README.md) is the detailed reference — statistics core, parity results, caching, database handles, backups and restore drill. Read it before changing anything in `src/lib/stats/` or `src/db/`.

## Layout

- `src/api/` — Hono app ([index.ts](src/api/index.ts)) plus `queries.ts` / `statsQueries.ts`. Screen-shaped endpoints: `/v1/home`, `/v1/parks/:id`, `/v1/rides/:id`, `/v1/rides/:id/stats?year=`, `/v1/rides/:id/day?date=`, `/v1/config`, `/health`. No auth. `AppType` is exported from [src/index.ts](src/index.ts) and consumed by the Expo app's `hc` client.
- `src/worker/` — croner schedules ([index.ts](src/worker/index.ts)); each job body in `jobs/`.
- `src/cli/` — one-off operator commands run in the worker container; `backfill.ts` recovers days a worker outage missed (README → Backfill).
- `src/lib/stats/` — `bucketize.ts` (change log → hourly buckets + `wait_dist`), `rollup.sql` / `rollup.ts` (hourly → daily).
- `src/lib/` — `themeparks.ts` (API client, rate limiter, history budget), `locks.ts`, `jobRuns.ts`, `cache.ts` (LRU + `LISTEN airtimely_poll`), `nominatim.ts`.
- `src/db/schema/` — Drizzle tables; `drizzle/` — generated migrations. `0000` (partitioning) and `0001` (partition helpers) are hand-edited; see the README before regenerating.
- `docs/` — `themeparks-wiki-v1.yaml` (upstream API spec), `DECOMMISSION.md` (v1 teardown runbook), `history/v1-patches/` (the v1 SQL fixes the statistics core ports; the written record, not code).

## Jobs (all UTC, all wrapped by `runJob`)

| Job | Schedule | What |
|---|---|---|
| `live_poll` | `*/5` | `/entity/{park}/live` → `ride_live`; `ride_changes` only on a state change; `NOTIFY airtimely_poll`; dead-man ping. Parks outside schedule ±1 h polled hourly |
| `finalise_day` | 01:20 | D-1…D-3 per park from `/history`, fallback to own `ride_changes`; writes hourly + daily; deletes that day's changes. Retries up to 30 days |
| `validate` | 02:10 | Compares our results with `/history/daily`; findings in `job_runs.summary` |
| `maintenance` | 02:40 | Partitions for tomorrow, drop finalised ones, `analyze` |
| `schedule_sync` | 02,08,12,16,18,22 :15 | `parks_schedule`, delete-then-insert per returned date |
| `metadata_sync` | Mon 03:00 | Park sync **then** entity sync (rides, shows, restaurants) — one job, in order |

`runJob` takes `pg_try_advisory_lock` (a held lock = silent no-op) and records every attempt in `job_runs`. New jobs go through it.

## Statistics rules — do not break

- Store true UTC instants; derive park-local date/hour from `parks.timezone`. Never store local wall time in a `timestamptz`.
- `ride_stats_hourly` is keyed by `bucket_start` (an instant). The autumn DST hour yields two rows with the same `local_hour`; group by `bucket_start`, never `local_hour`.
- Wait values count **only while OPERATING**, weighted by **duration**, not sample count.
- Means are `sum(wait_sum) / sum(wait_minutes)` — never an average of averages. Percentiles over a period come from summed `wait_dist` maps.
- No schedule ⇒ uptime/downtime NULL. Nothing operated ⇒ every wait statistic NULL, never 0. Flat day ⇒ no peak/quietest hour.
- Schedule windows come from `local_date` **and** `local_date - 1` (past-midnight closings), but "does this day have a schedule" uses the day's **own** entry only.
- `ride_changes` rows are deleted only after `park_day_ingest.finalised_at` is set.
- Every aggregate is computed server-side. Endpoints return shaped results, never raw rows for the phone to average.

## Commands

```sh
npm run dev:api | dev:worker   # tsx watch, needs DATABASE_URL
npm run typecheck
npm test                       # runs db:migrate first; needs a local Postgres 18 (see README)
npm run build                  # also required before the app typechecks (AppType via dist/)
npm run db:generate            # after a schema change
```

## Conventions

- Aggregations are raw SQL through `sql` (postgres.js). Drizzle (`getDb()`) is for schema and simple reads, on a **separate** client — never `drizzle(sql)`.
- Pass row sets to SQL with `sql.json(rows)` + `jsonb_to_recordset`.
- ThemeParks API: ≤5 req/s overall, history budget 600/h on the free key (`THEMEPARKSWIKI_API_KEY`). A history `404` means "nothing recorded", not an error.
- After changing a route's response shape, rebuild so the app's `AppType` updates, and bump `CACHE_GENERATION` in `app/_layout.tsx` if persisted payloads change shape.
