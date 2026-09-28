# Decommissioning v1 (Supabase + Windmill)

The runbook for Phase 10 of the backend v2 plan. Run it in order: the netcup box hosts
unrelated apps, so this is a targeted removal, and **nothing is deleted until the
archive that replaces it has been restored and checked**.

The repo side (10.5, 10.6) is already done: `windmill/`, `supabase/`, the v1 helper
scripts and the `update-live-data` GitHub workflow are gone; the SQL patches live on in
[`history/v1-patches/`](history/v1-patches/).

Tick each box as you go.

## 0. Before starting

- [ ] The v2 app build is released and the force-update gate is live (`/v1/config`'s
      `minAppVersion` is at or above the first v2 build).
- [ ] The v2 worker has finalised at least a few nights without help. Check in Beekeeper:

  ```sql
  select job, started_at::date as day, ok,
    summary->>'processed' as processed, summary->>'failureCount' as failures,
    summary->>'discrepancyRate' as discrepancy_pct, error
  from job_runs
  where job in ('finalise_day', 'validate', 'maintenance')
  order by started_at desc
  limit 15;
  ```

  Every row `ok = true`, and `validate`'s `discrepancyRate` in the low single digits.
- [ ] The dead-man check (healthchecks.io / Uptime Kuma) has stayed green over the same nights.

## 1. Stop the old pipeline (10.1)

Stop the writes. Delete nothing yet.

- [ ] **GitHub → Actions → "Update Live Data" → Disable workflow.** The workflow file is
      deleted on `backend-v2`, but GitHub keeps running the schedule from `main` until the
      branch is merged. It calls the Supabase Edge Function `update-live-data-02` every
      2 minutes, so it is a writer too.
- [ ] Windmill → Schedules → **disable** all seven (do not delete):
  - live data, every 5 min
  - hourly aggregation, `:05`
  - daily aggregation, 11:00
  - monthly aggregation, 2nd 00:00
  - park schedules, 02/08/12/16/18/22
  - park sync, Mon 00:00
  - ride sync, Mon 00:00
- [ ] Wait 15 minutes, then confirm Supabase has stopped growing:

  ```sql
  -- run against Supabase; should not move between two runs
  select max(recorded_at_timestamp) from ride_wait_times;
  ```

- [ ] Leave Supabase running and readable.

## 2. Move the history key first (10.4, part 1)

- [ ] Copy Windmill variable `u/steven_s1508/THEMEPARKS_API_KEY` into the Coolify
      **worker** application as `THEMEPARKSWIKI_API_KEY`, if it is not already there.
      Redeploy the worker and check the next `finalise_day` run has no budget or 401
      errors. Without this key finalisation drops to 60 requests/h and a 7-day window.

## 3. Archive (10.2)

Take a final dump of **every** table, including the ones v2 did not carry
(`ride_wait_times`, `hourly_ride_statistics`, `monthly_ride_statistics`,
`daily_weather`, `holidays`). Use the Postgres 18 client: newer `pg_dump` reads older
servers, not the reverse.

```sh
# V1_URL = the Supabase Postgres connection string (the DB_URL formerly in the root .env)
STAMP=$(date -u +%Y-%m-%d)
docker run --rm -v "$PWD:/out" postgres:18-alpine \
  pg_dump "$V1_URL" --format=custom --no-owner --no-privileges \
    --schema=public --file=/out/airtimely-v1-final-$STAMP.dump
```

**Row counts.** Record them before anything else changes. Exact counts, not
`n_live_tup` estimates:

```sh
docker run --rm postgres:18-alpine psql "$V1_URL" -At -c "
  select format('select %L as table, count(*) from public.%I', relname, relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  order by relname" \
| docker run --rm -i postgres:18-alpine psql "$V1_URL" -At -F $'\t' -f - \
  > airtimely-v1-final-$STAMP.counts.tsv
```

**Restore and spot-check.** An unverified dump is not an archive.

```sh
docker run -d --name v1-restore -e POSTGRES_PASSWORD=x -v "$PWD:/in" postgres:18-alpine
sleep 5
docker exec v1-restore createdb -U postgres v1
docker exec v1-restore pg_restore -U postgres -d v1 --no-owner --no-privileges \
  /in/airtimely-v1-final-$STAMP.dump
# Same counting query as above against the restored copy, then diff:
docker exec v1-restore psql -U postgres -d v1 -At -c "
  select format('select %L as table, count(*) from public.%I', relname, relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  order by relname" \
| docker exec -i v1-restore psql -U postgres -d v1 -At -F $'\t' -f - \
  | diff - airtimely-v1-final-$STAMP.counts.tsv && echo "counts match"
# Spot-check the golden day: expect 31.61 / 100 / 0
docker exec v1-restore psql -U postgres -d v1 -c "
  select d.avg_wait_time_minutes, d.operational_percentage, d.downtime_minutes
  from daily_ride_statistics d join rides r on r.id = d.ride_id
  where d.ride_id = '2b0116fd-dafb-4615-8869-6ca934c461ba'  -- Space Mountain, Magic Kingdom
    and d.date = '2026-09-12'"
docker rm -f v1-restore
```

- [ ] Dump restored and counts match.
- [ ] Golden day correct.
- [ ] Write `README.txt` next to the dump: date, source host, the counts TSV and the
      restore command above.

**Store it off-box, twice:**

- [ ] **NAS**: copy the dump, counts and README into the archive share. Not the Syncthing
      folder that mirrors the VPS backups, which gets removed in step 5.
- [ ] **R2**, under a prefix the 14-day lifecycle rule does not touch:

  ```sh
  R2=https://<account_id>.r2.cloudflarestorage.com
  aws s3 cp airtimely-v1-final-$STAMP.dump  s3://airtimely-backups/archive/ --endpoint-url "$R2"
  aws s3 cp airtimely-v1-final-$STAMP.counts.tsv s3://airtimely-backups/archive/ --endpoint-url "$R2"
  aws s3 cp README.txt s3://airtimely-backups/archive/ --endpoint-url "$R2"
  ```

  Before trusting this, open R2 → bucket → **Settings → Object lifecycle rules**. If the
  14-day rule has no prefix, it applies to the whole bucket **including `archive/`**.
  Scope it to the prefix Coolify writes backups under, or put the archive in a
  separate bucket with no lifecycle rule.

- [ ] Also keep the Phase 7 transform dump alongside it, if it is not already archived.

## 4. Hold

Leave Supabase idle and readable for a few more nights. Delete nothing until the
worker keeps finalising without help and nobody has needed the old database.

## 5. Remove the services (10.3)

Only once section 3 is ticked. In Coolify:

- [ ] Delete the **Supabase** stack: postgres, auth (GoTrue), realtime, storage, kong,
      rest (PostgREST), studio, meta, edge-runtime, imgproxy, analytics, vector.
- [ ] Delete the **Windmill** stack: server, workers, LSP, its Caddy, and **Windmill's own
      Postgres**.
- [ ] Delete the Docker **volumes** of both. This is where the ~1.9 GB lives. Removing
      containers alone reclaims nothing. On the host:

  ```sh
  docker volume ls | grep -Ei 'supabase|windmill'   # inspect first
  docker volume rm <names>
  ```

- [ ] Remove Coolify domains / Traefik routes for Kong, Studio and Windmill, and the
      matching **DNS records** (`supabase.spsdev.de` and the Windmill host).
- [ ] Close any **firewall rules or host ports** opened for v1. Supabase Postgres answers on
      `supabase.spsdev.de:5432`, which is public. Confirm it is closed afterwards:
      `nc -vz supabase.spsdev.de 5432` should fail.
- [ ] Delete any Coolify **scheduled backups** attached to the Supabase resource, and the
      Syncthing folder that replicated them. **Do not touch** the v2 Postgres backups to
      R2.

## 6. Secrets (10.4, part 2)

- [ ] Windmill is gone, but if its workspace export exists anywhere, remove
      `u/steven_s1508/SUPABASE_URL` and `u/steven_s1508/SERVICE_ROLE_KEY` from it.
- [ ] Rotate or revoke the Supabase JWT secret, anon key and service role key if the
      Supabase project or its secrets live on anywhere (another host, a backup of
      `.env` files, the EAS dashboard). Once the host is gone they are dead in practice;
      this covers the copies.
- [ ] EAS → project → Environment variables: delete `EXPO_PUBLIC_SUPABASE_URL` and
      `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] GitHub → repo → Settings → Secrets: delete `SUPABASE_URL` and `FUNCTION_SECRET`
      (used only by the deleted workflow).
- [ ] Root `.env`: remove `DB_URL` (the Supabase connection string used for type
      generation) once the archive in section 3 is taken.

## 7. Confirm the outcome (10.7)

- [ ] RAM, on the host:

  ```sh
  docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}' | grep -Ei 'airtimely|postgres'
  ```

  Postgres + api + worker should total well under 1 GB, against ~5–6 GB before. Record
  the figure below.
- [ ] Disk reclaimed: `df -h /` before and after section 5. Record below.
- [ ] Repo: `grep -riE "supabase|windmill" --exclude-dir=node_modules --exclude-dir=.docs --exclude-dir=.git .`
      returns only `server/docs/` (this file and the history) and the historical notes in
      `server/README.md`.
- [ ] `npm run typecheck` and a clean `npx expo export` bundle.

| Measure | Before | After |
|---|---|---|
| RAM (v1 stack vs v2 stack) | ~5–6 GB | |
| Disk used on `/` | | |
