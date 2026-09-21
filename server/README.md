# airtimely-server

Backend v2 for Airtimely: a read-only Hono API and a croner worker over Postgres 18,
replacing self-hosted Supabase + Windmill.

Architecture record: [`.docs/backend-v2/DECISIONS.md`](../.docs/backend-v2/DECISIONS.md).

## Layout

| Path | Purpose |
|---|---|
| `src/api/` | Hono routes. Read-only, no auth, screen-shaped endpoints |
| `src/worker/` | croner schedules; each job wrapped in a Postgres advisory lock |
| `src/lib/stats/` | The aggregation core — change log to hourly to daily |
| `src/db/schema/` | Drizzle tables |
| `src/db/sql/` | Hand-written SQL: partitioning, and the daily rollup statement |
| `drizzle/` | Generated migration SQL |

Aggregations stay raw SQL. Drizzle owns the schema, migrations and simple reads.

## Local development

```sh
cp .env.example .env        # fill in DATABASE_URL at minimum
npm run dev:api             # or: npm run dev:worker
npm run typecheck
npm test
```

The Expo app imports `AppType` from this package for end-to-end `hc` types. That
resolves through `dist/`, so **the server must be built before the app typechecks**.
`npm install` at the repo root does this automatically via the `prepare` script; after
changing a route, run `npm run build -w airtimely-server`.

## Local database

Phase work runs against a throwaway Postgres 18, never the Coolify one:

```sh
docker run -d --name airtimely-pg18   -e POSTGRES_PASSWORD=dev -e POSTGRES_USER=dev -e POSTGRES_DB=airtimely   -p 55432:5432 postgres:18-alpine

export DATABASE_URL=postgres://dev:dev@127.0.0.1:55432/airtimely
npm run db:migrate
```

**Resetting it:** dropping `public` is not enough. Drizzle records applied migrations
in its own `drizzle` schema, so a half-reset leaves the ledger intact and the next
`db:migrate` reports success while doing nothing. Drop both:

```sh
docker exec airtimely-pg18 psql -U dev -d airtimely   -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"
```

## Migrations

`npm run db:generate` diffs `src/db/schema/` against the snapshot in `drizzle/meta/`
and writes a new SQL file; `npm run db:migrate` applies pending ones.

Two migrations are hand-maintained and must survive regeneration:

- **`0000_initial_schema.sql`** — the generated `CREATE TABLE "ride_changes"` was
  edited to add `PARTITION BY RANGE ("ts")`. Drizzle cannot express declarative
  partitioning. Ordinary `generate` runs emit diffs against the snapshot and leave
  this alone; only regenerating 0000 from scratch would lose it. The file carries a
  warning comment at that line.
- **`0001_partition_helpers.sql`** — `create_ride_changes_partition(date)` and
  `drop_ride_changes_partitions_before(date)`, plus seeds for today and tomorrow.

There is deliberately **no default partition**: an insert for a day with no partition
fails loudly rather than piling into a catch-all nobody drops, which makes the nightly
maintenance job self-checking.

## Statistics core

Two pieces, in `src/lib/stats/`:

- **`bucketize.ts`** — a change log to per-hour buckets plus the day's `wait_dist`.
  Each state holds until the next change, clipped to the park-local day; weighting is
  by **duration**, not sample count; wait values count **only while OPERATING**, since
  rides keep displaying their last wait while DOWN or CLOSED.
- **`rollup.sql`** — hourly buckets to one daily row per ride. Ported from
  `upsert_daily_from_hourly_json()` as it stands in
  `supabase/patches/2026-09-19_05_operating_only_hourly_data.sql`. Port from the
  **patch files**, never from `supabase/db-functions/`, which has drifted: patch _02's
  version had an `avg()` fallback that reintroduced closed-day zeros.

Rules that must survive any future edit:

| Situation | Result |
|---|---|
| No schedule for the day | uptime and downtime **NULL** — unknown, never guessed, never 0 |
| Nothing operated | every wait statistic **NULL**, never 0 |
| Flat day | no peak hour, no quietest hour |
| Window runs past local midnight | counted (windows read from `local_date` and `local_date - 1`) |
| Selecting days with *no* schedule | the day's **own** entry only — including `- 1` excluded every Monday whose Sunday had hours |
| Partial hour inside a window | counted, clipped to the overlap |

### Parity gate

`test/rollupParity.test.ts` replays 15 real ride-days across 6 timezones — pulled from
the live v1 database *after* patches _02.._06 corrected them — and requires the new
rollup to reproduce v1's mean, uptime, downtime, range and peak hours. It includes the
day named in DECISIONS.md §9: Space Mountain 2026-09-12, avg **31.61**, **100%**
uptime, **0** downtime.

Two figures deliberately differ and are not asserted: v1's median was the median *of
hourly averages*, unweighted, while v2's p50 comes from `wait_dist`; and historic days
have no `wait_dist`, so they get no percentiles at all.

Fixtures were captured by `scripts/fetch-parity-fixtures.mjs` and
`scripts/fetch-parity-edge-cases.mjs`, which read the live Supabase over PostgREST.
Both scripts go at decommission (Phase 10); the captured JSON stays.

### Live validation against the API's own figures

The `validate` job compares our results with ThemeParks.wiki's own daily summaries,
which are computed independently from the same change logs. Run against real history
for Magic Kingdom, Europa-Park and Tokyo Disneyland (2026-09-17..19):

```
ride-days compared: 283     discrepancies: 0

operatingMinutes  mean |d| 0.51  median 0  max 2      (segment boundary rounding)
downMinutes       mean |d| 0.05  median 0  max 1
mean wait         mean |d| 0.19  median 0.17  max 0.5  (API reports an integer)
p50               exact on all 267
p90               exact on 266/267
```

It compares against `ride_stats_hourly` summed over the day, not `ride_stats_daily`:
the API's operatingMinutes covers the whole local day while our daily row is clipped to
park opening hours, so comparing those would manufacture a difference at every park
that runs a ride outside its posted hours. The clipping is covered by the parity
fixtures instead.

Reproduce with a real key in the environment:

```sh
node --env-file=../.env scripts/seed-from-v1.mjs "Magic Kingdom Park" "Europa-Park"
# then run finaliseDay and validate against the seeded parks
```

Where v1 picked one arbitrary member of a tied group for peak/quietest hour, the test
accepts the tie. v2 adds `bucket_start` as a final sort key so its own choice is
deterministic.

## API

Endpoints are shaped around screens, not tables. v1 chained two or three round trips
per screen and computed park open/closed on the device.

| Endpoint | Replaces |
|---|---|
| `GET /v1/home` | displayable entities + child parks + bulk park status |
| `GET /v1/parks/:id` | park children + status + schedule + the park-name lookup |
| `GET /v1/rides/:id` | live ride statistics, plus today's changes |
| `GET /v1/rides/:id/stats` | hour-of-day, weekday and monthly profiles + percentiles; `?year=` |
| `GET /v1/rides/:id/day?date=` | new: one past day's curve |
| `GET /v1/config` | `minAppVersion` for the force-update gate |
| `GET /health` | liveness + poll staleness |

**The ride screen deliberately gets two endpoints.** Live state moves every five
minutes; the historical aggregates change once a night at finalisation. One endpoint
would force the client to re-fetch a year of history every five minutes, or let the
live wait go stale.

**`status` is `open` / `closed` / `unknown`.** A park with no schedule entry for today
has hours we do not know; rendering "Closed" there would be a guess. The same
distinction runs through the statistics.

Every mean is minute-weighted — `sum(wait_sum) / sum(wait_minutes)` — never an average
of averages, which would weight a ten-minute hour the same as a full one. Percentiles
over a period come from summing the daily `wait_dist` maps, because percentiles cannot
be averaged.

### Caching

In-process, keyed by URL, tagged by park id. After each poll the worker issues
`NOTIFY airtimely_poll, '<park_id>'` and the api evicts exactly that park's entries;
TTLs are only a ceiling for a missed notification. Responses carry `Cache-Control` and
a weak `ETag`, so an unchanged park costs a 304 with no body rather than ~17 KB.

Verified end to end: `MISS` then `HIT`, `304` on a matching `If-None-Match`, `MISS`
again after a `NOTIFY` for that park, and an unrelated park's entries untouched.

No Redis. A single api process does not need one, and if there is ever a second a CDN
in front beats a shared cache.

## Sync jobs

Three ports of the Windmill scripts, with four corrections.

| Job | Schedule (UTC) | Source |
|---|---|---|
| `metadata_sync` | Mon 03:00 | `run_update_parks.ts` then `run_update_rides.ts` |
| `schedule_sync` | 6x daily | `run_update_park_schedules.ts` |

**Park sync writes a changed timezone.** v1 built an update object containing
`timezone` but only *issued* the update when name, external_id or is_destination
changed — so a park whose timezone moved in the API was never corrected, even though
timezone decides every park-local bucket boundary.

**Park and entity sync are one job, in order.** v1 ran them as two Windmill jobs both
scheduled Monday 00:00, so a newly added park could be synced for rides before its row
existed.

**Entity sync covers shows and restaurants.** v1 filtered `/children` to ATTRACTION and
discarded the rest, so `shows` and `restaurants` were never populated by any job. The
response already contains them: a first real run produced 6,504 rides, 1,987 shows and
2,855 restaurants from the same 198 requests.

**`PARK_OPEN` is stored as an operating window.** Some parks express opening hours only
with this type. v1's CHECK constraint rejected it, which failed the bulk insert for the
*whole park* — Universal Studios Singapore ended up with zero schedule rows, and all 18
of its rides therefore reported NULL uptime on every single day. `TYPE_ALIASES` in
`scheduleSync.ts` maps it, which keeps the load-bearing `type = 'OPERATING'` test in the
rollup a single condition. Any other unrecognised type is skipped per-row and reported
in `job_runs.summary.unknownTypes`, never failing the park.

Deactivation is guarded in both directions: parks are only deactivated when the whole
destination sweep succeeded, and a park returning an empty `/children` list is treated
as a bad response rather than a park that lost every ride.

## Two database handles

`src/db/index.ts` exports **`sql`** (postgres.js, the primary handle) and **`getDb()`**
(Drizzle). They are deliberately backed by *separate* clients.

`drizzle(client)` **mutates** the postgres.js client it is given, installing its own
parsers and serializers. On a shared client that would silently change every raw query:

| | plain postgres.js | after `drizzle()` attaches |
|---|---|---|
| `timestamptz` read | `Date` | `"2026-09-20 16:50:54.87+00"` string |
| `date` read | `Date` at UTC midnight | `"2026-09-20"` string |
| `Date` as a parameter | works | throws |

Almost everything here is raw SQL by design, so `sql` stays unwrapped and Drizzle gets
its own connection, constructed lazily on first use. **Do not pass `sql` to
`drizzle()`.** The tradeoff: a transaction cannot span both handles. Nothing needs it
to — the worker writes exclusively through `sql`, and API reads are single statements.

`sql` does override one parser: `date` returns a plain `'YYYY-MM-DD'` string rather
than a `Date` pinned to UTC midnight, which renders as the previous day in any
negative-offset zone. Every date in this schema is a park-local calendar date.

### Passing rows to a query

Use `sql.json(rows)` expanded by `jsonb_to_recordset`:

```ts
const rows = sql.json(items.map((i) => ({ ride_id: i.id, wait: i.wait })));
await sql`
  select * from jsonb_to_recordset(${rows}::jsonb) as t(ride_id uuid, wait smallint)
`;
```

Two things that look right and are not: postgres.js's `sql(rows)` helper builds an
INSERT column/VALUES fragment, not a derived table, so `select * from ${sql(rows)}`
silently matches nothing; and passing an already-`JSON.stringify`ed array gets encoded
a second time, arriving as a jsonb *string* rather than an array.

## Database access

Postgres is on Coolify's private network with no public port. For ad-hoc work, tunnel
to it and point Beekeeper Studio at localhost:

```sh
ssh -N -L 5433:<postgres-container-host>:5432 <user>@<netcup-host>
```

Then connect Beekeeper to `localhost:5433`. Never expose 5432.

## Backups (Cloudflare R2)

Coolify owns the schedule and local retention; R2 is the off-box copy. Syncthing to the
Synology NAS is the second copy.

**Setup**

1. Cloudflare → R2 → create bucket `airtimely-backups`.
2. R2 → Manage API Tokens → new token, **Object Read & Write**, scoped to that bucket.
3. Coolify → Settings → **S3 Storages** → add:
   - Endpoint `https://<account_id>.r2.cloudflarestorage.com`
   - Region `auto` (the literal string)
   - Bucket, Access Key ID, Secret Access Key

   Coolify validates on save. If it fails, fix it here — not at the first backup.
4. Postgres resource → **Backups** → daily, local retention 3, tick **Save to S3**.
5. In R2, add a **lifecycle rule expiring objects after 14 days**. At ~400 MB per
   gzipped dump that is ~5.6 GB, inside the 10 GB free tier. The bucket then enforces
   its own ceiling regardless of what Coolify does.

**This outgrows the free tier.** Check the bucket size quarterly; once a single dump
passes ~600 MB, shorten the expiry or move to paid.

**Syncthing:** the receiving folder on the NAS must be **Receive Only** with
**staggered file versioning**. Syncthing mirrors deletions otherwise, and a faithful
mirror of a deletion is not a backup.

### Restore drill

Run this after setup and whenever the backup config changes. It is the procedure that
runs under pressure, so it stays written down.

```sh
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
R2=https://<account_id>.r2.cloudflarestorage.com

aws s3 ls s3://airtimely-backups/ --endpoint-url "$R2"
aws s3 cp s3://airtimely-backups/<newest-object> ./restore.sql.gz --endpoint-url "$R2"

createdb airtimely_restore_test
gunzip -c restore.sql.gz | psql -d airtimely_restore_test

# Compare against production row counts before declaring success.
psql -d airtimely_restore_test -c "
  select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;"
dropdb airtimely_restore_test
```

## Data transform from v1 (one-shot, Phase 7)

`scripts/transform-v1/` turns a `pg_dump` of the Supabase `public` schema into v2 data.
It runs **locally only** (it refuses any non-localhost `DATABASE_URL`); production gets
the verified result with `pg_restore`, never the transform itself.

```sh
# v1 dump restored as database `v1`; empty, migrated target as `airtimely_v2`
DATABASE_URL=postgres://dev:dev@127.0.0.1:55432/airtimely_v2 \
  node --import tsx scripts/transform-v1/run.ts          # ~6 min
#   ... --verify-only                                     # re-run just the checks
```

What it does and why:

- Entities and schedules copy 1:1 with IDs preserved; schedule and show times become
  `timestamptz`, `date` becomes `local_date`.
- `hourly_data` becomes `ride_stats_hourly` with `wait_sum = round(avg * op)`. **Only
  hours the ride operated** are carried: 8.45M rows instead of 37.4M. The rest were
  closed hours with no values, and historic rows have no `down_min`/`closed_min` to
  make them informative.
- Daily rows are rebuilt by **the worker's own `rollup.sql`**, then days on which a
  ride never operated are added from v1's downtime (which equals the scheduled minutes
  on such a day). This makes the transform a parity run of the rollup over all of v1.
- Historic days have no `wait_dist`, hence no percentiles. Decided, not a bug.

Result of the 2026-09-21 run, every one of v1's 1,808,131 daily rows compared:

| Check | Result |
|---|---|
| Row counts, all 9 tables | identical |
| Missing / extra daily rows | 0 / 0 |
| Uptime, downtime, min, max | 0 differences |
| Mean | 76 rows > 0.01, max delta 0.1 |
| Peak / quietest hour | 62,778 exact ties v1 broke arbitrarily; 55 rounding flips |
| Golden day (Space Mountain 2026-09-12) | 31.61, 100%, 0 min |

The residual mean and hour differences are v1's own 2-decimal rounding of hourly
averages meeting the integer `wait_sum`: two hours both stored as 5.50 become 5.60 and
5.52 at a handful of operating minutes.

## Deployment

One image, two Coolify applications, distinguished by `APP_ROLE=api|worker`. Postgres
stays private; only the api gets a domain and a Traefik route.
