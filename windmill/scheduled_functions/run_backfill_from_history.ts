// Windmill Script: Backfill From ThemeParks History
// Language: TypeScript (Deno)
// Description: Rebuild hourly + daily ride statistics for completed park-local days from the
// ThemeParks.wiki history API. One request returns every state change of every entity in a park
// for one local day; the changes are turned into time-weighted hourly rows (same format as the
// poller-based hourly aggregation) and folded into daily rows by aggregate_daily_for_park.
// Rides missing from the API response fall back to whatever raw poller data exists.
//
// Requires: supabase/patches/2026-09-18_02_fix_daily_aggregation.sql applied, and a Windmill
// secret variable u/steven_s1508/THEMEPARKS_API_KEY (free key: 30 days back, 600 history
// requests per hour — one request per park per day).
//
// Only run it for days whose daily aggregation has already happened (or will not happen):
// the regular daily job at 11:00 Europe/Berlin would otherwise overwrite the result with
// partial poller data.

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DateTime } from "npm:luxon@3";

const THEMEPARKS_API_BASE_URL = "https://api.themeparks.wiki/v1";
const THEMEPARKS_API_REQUEST_DELAY_MS = 250;
const MAX_ERROR_RETRIES = 4;
const MAX_RATE_LIMIT_WAITS = 3;
const UPSERT_CHUNK_SIZE = 500;

type LiveState = {
    status?: string | null;
    queue?: {
        STANDBY?: { waitTime?: number | null };
        SINGLE_RIDER?: { waitTime?: number | null };
    };
};

type HistoryRow = LiveState & { time: string; changed?: string[] };

export type HistoryEntity = {
    id: string;
    name: string;
    entityType: string;
    opening?: LiveState & { time: string };
    history?: HistoryRow[];
};

type HourAccumulator = {
    covered: number;
    operating: number;
    waitSum: number;
    waitMinutes: number;
    waitMin: number | null;
    waitMax: number | null;
    singleSum: number;
    singleMinutes: number;
};

export type HourlyRow = {
    ride_id: string;
    date: string;
    hour: number;
    avg_wait_time_minutes: number | null;
    min_wait_time_minutes: number | null;
    max_wait_time_minutes: number | null;
    avg_single_rider_wait_minutes: number | null;
    data_points_count: number;
    operational_minutes: number;
    updated_at: string;
};

async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function addSegment(hours: Map<number, HourAccumulator>, hour: number, minutes: number, state: LiveState) {
    const acc = hours.get(hour) ?? {
        covered: 0,
        operating: 0,
        waitSum: 0,
        waitMinutes: 0,
        waitMin: null,
        waitMax: null,
        singleSum: 0,
        singleMinutes: 0,
    };
    acc.covered += minutes;

    if (state.status === "OPERATING") {
        acc.operating += minutes;

        const wait = state.queue?.STANDBY?.waitTime;
        if (typeof wait === "number") {
            acc.waitSum += wait * minutes;
            acc.waitMinutes += minutes;
            acc.waitMin = acc.waitMin === null ? wait : Math.min(acc.waitMin, wait);
            acc.waitMax = acc.waitMax === null ? wait : Math.max(acc.waitMax, wait);
        }

        const single = state.queue?.SINGLE_RIDER?.waitTime;
        if (typeof single === "number") {
            acc.singleSum += single * minutes;
            acc.singleMinutes += minutes;
        }
    }

    hours.set(hour, acc);
}

/**
 * Turns one entity's change log for a park-local day into per-local-hour accumulators.
 * Each state is valid from its `time` until the next row; `opening` is the state at the start
 * of the day. On the autumn DST change the repeated local hour is merged into one bucket.
 */
export function bucketizeEntity(entity: HistoryEntity, date: string, timezone: string): Map<number, HourAccumulator> {
    const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf("day");
    const dayStartMs = dayStart.toMillis();
    const dayEndMs = dayStart.plus({ days: 1 }).toMillis();

    const states: { t: number; state: LiveState }[] = [];
    if (entity.opening) states.push({ t: Date.parse(entity.opening.time), state: entity.opening });
    for (const row of entity.history ?? []) states.push({ t: Date.parse(row.time), state: row });
    states.sort((a, b) => a.t - b.t);

    const hours = new Map<number, HourAccumulator>();
    for (let i = 0; i < states.length; i++) {
        const start = Math.max(states[i].t, dayStartMs);
        const end = Math.min(i + 1 < states.length ? states[i + 1].t : dayEndMs, dayEndMs);

        let cursor = start;
        while (cursor < end) {
            const hourStart = DateTime.fromMillis(cursor, { zone: timezone }).startOf("hour");
            const segmentEnd = Math.min(end, hourStart.plus({ hours: 1 }).toMillis());
            addSegment(hours, hourStart.hour, (segmentEnd - cursor) / 60000, states[i].state);
            cursor = segmentEnd;
        }
    }
    return hours;
}

/**
 * Converts accumulators into hourly_ride_statistics rows. data_points_count is expressed as
 * 5-minute sample equivalents of covered time (12 for a fully covered hour) so it stays
 * comparable with poller-based rows.
 */
export function toHourlyRows(rideId: string, date: string, hours: Map<number, HourAccumulator>): HourlyRow[] {
    const updatedAt = new Date().toISOString();
    return [...hours.entries()]
        .filter(([, acc]) => acc.covered > 0)
        .sort(([a], [b]) => a - b)
        .map(([hour, acc]) => ({
            ride_id: rideId,
            date,
            hour,
            avg_wait_time_minutes: acc.waitMinutes > 0 ? round2(acc.waitSum / acc.waitMinutes) : null,
            min_wait_time_minutes: acc.waitMin,
            max_wait_time_minutes: acc.waitMax,
            avg_single_rider_wait_minutes: acc.singleMinutes > 0 ? round2(acc.singleSum / acc.singleMinutes) : null,
            data_points_count: Math.round(acc.covered / 5),
            operational_minutes: Math.round(acc.operating),
            updated_at: updatedAt,
        }));
}

async function fetchParkHistory(externalId: string, date: string, apiKey: string) {
    const url = `${THEMEPARKS_API_BASE_URL}/entity/${externalId}/history?date=${date}`;
    let errorRetries = 0;
    let rateLimitWaits = 0;

    while (true) {
        const response = await fetch(url, {
            headers: {
                "X-API-Key": apiKey,
                "User-Agent": "Airtimely-Windmill-Backfill (hi@airtimely.app)",
            },
        });

        if (response.ok) return await response.json();

        // "Entity history not found": nothing recorded for this park/day
        if (response.status === 404) return null;

        if (response.status === 429 && rateLimitWaits < MAX_RATE_LIMIT_WAITS) {
            const body = await response.json().catch(() => ({}));
            const retryAfter = Number(body?.error?.retryAfter ?? body?.retryAfter ?? response.headers.get("retry-after") ?? 60);
            rateLimitWaits++;
            console.warn(`⏳ Rate limited (${body?.error?.type ?? "429"}), waiting ${retryAfter}s before retrying ${date} ${externalId}`);
            await delay((retryAfter + 1) * 1000);
            continue;
        }

        if (response.status >= 500 && errorRetries < MAX_ERROR_RETRIES) {
            errorRetries++;
            await delay(2 ** errorRetries * 1000);
            continue;
        }

        const text = await response.text().catch(() => "");
        throw new Error(`History request failed: ${response.status} ${response.statusText} ${text.slice(0, 300)}`);
    }
}

function datesBetween(from: string, to: string): string[] {
    const dates: string[] = [];
    let cursor = DateTime.fromISO(from);
    const end = DateTime.fromISO(to);
    if (!cursor.isValid || !end.isValid) throw new Error(`Invalid date range ${from} – ${to}`);
    while (cursor <= end) {
        dates.push(cursor.toISODate()!);
        cursor = cursor.plus({ days: 1 });
    }
    return dates;
}

export async function main(
    date_from: string,
    date_to?: string,
    park_external_ids?: string[],
    cleanup: boolean = true,
    dry_run: boolean = false
) {
    const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
    const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");
    const themeparksApiKey = await wmill.getVariable("u/steven_s1508/THEMEPARKS_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !themeparksApiKey) {
        throw new Error("Missing required variables: SUPABASE_URL, SERVICE_ROLE_KEY and THEMEPARKS_API_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Windmill passes "" for an empty optional field
    const dates = datesBetween(date_from, date_to || date_from);

    let parksQuery = supabase
        .from("parks")
        .select("id, external_id, name, timezone")
        .eq("is_active", true)
        .not("external_id", "is", null);
    if (park_external_ids && park_external_ids.length > 0) {
        parksQuery = parksQuery.in("external_id", park_external_ids);
    }

    const { data: parks, error: parksError } = await parksQuery;
    if (parksError) throw new Error(`Error fetching parks: ${parksError.message}`);
    if (!parks || parks.length === 0) {
        return { success: true, dates, message: "No active parks found" };
    }

    console.log(`Backfilling ${dates.length} day(s) for ${parks.length} park(s)${dry_run ? " (dry run)" : ""}`);

    let parkDaysProcessed = 0;
    let parkDaysWithoutHistory = 0;
    let parkDaysSkippedUnfinished = 0;
    let hourlyRowsWritten = 0;
    let ridesAggregated = 0;
    let unknownAttractions = 0;
    // external_id -> "Park: Ride" for attractions the API knows but the rides table does not
    const unknownAttractionNames = new Map<string, string>();
    const failures: { park: string; date: string; error: string }[] = [];

    for (const date of dates) {
        for (const park of parks) {
            const timezone = park.timezone || "UTC";

            // Only completed park-local days
            const dayEnd = DateTime.fromISO(date, { zone: timezone }).startOf("day").plus({ days: 1 });
            if (dayEnd > DateTime.now()) {
                parkDaysSkippedUnfinished++;
                continue;
            }

            try {
                const history = await fetchParkHistory(park.external_id, date, themeparksApiKey);
                const entities: HistoryEntity[] = history?.entities ?? [];
                if (entities.length === 0) parkDaysWithoutHistory++;

                const { data: rides, error: ridesError } = await supabase
                    .from("rides")
                    .select("id, external_id")
                    .eq("park_id", park.id)
                    .not("external_id", "is", null);
                if (ridesError) throw new Error(`Error fetching rides: ${ridesError.message}`);

                const rideIdByExternalId = new Map<string, string>((rides ?? []).map((r: any) => [r.external_id, r.id]));

                const rows: HourlyRow[] = [];
                for (const entity of entities) {
                    const rideId = rideIdByExternalId.get(entity.id);
                    if (!rideId) {
                        if (entity.entityType === "ATTRACTION") {
                            unknownAttractions++;
                            unknownAttractionNames.set(entity.id, `${park.name}: ${entity.name}`);
                        }
                        continue;
                    }
                    rows.push(...toHourlyRows(rideId, date, bucketizeEntity(entity, date, timezone)));
                }

                if (dry_run) {
                    console.log(`[Dry Run] ${park.name} ${date}: ${entities.length} entities, ${rows.length} hourly rows`);
                } else {
                    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
                        const { error: upsertError } = await supabase
                            .from("hourly_ride_statistics")
                            .upsert(rows.slice(i, i + UPSERT_CHUNK_SIZE), { onConflict: "ride_id,date,hour" });
                        if (upsertError) throw new Error(`Error upserting hourly rows: ${upsertError.message}`);
                    }
                    hourlyRowsWritten += rows.length;

                    const { data: aggregated, error: dailyError } = await supabase.rpc("aggregate_daily_for_park", {
                        p_park_id: park.id,
                        p_date: date,
                        p_cleanup: cleanup,
                    });
                    if (dailyError) throw new Error(`Error aggregating daily stats: ${dailyError.message}`);
                    ridesAggregated += aggregated ?? 0;

                    console.log(`✅ ${park.name} ${date}: ${rows.length} hourly rows from history, ${aggregated ?? 0} rides aggregated`);
                }
                parkDaysProcessed++;
            } catch (error: any) {
                console.error(`❌ ${park.name} ${date}:`, error?.message ?? error);
                failures.push({ park: park.name, date, error: String(error?.message ?? error) });
            }

            await delay(THEMEPARKS_API_REQUEST_DELAY_MS);
        }
    }

    return {
        success: failures.length === 0,
        dry_run,
        dates,
        parks: parks.length,
        parkDaysProcessed,
        parkDaysWithoutHistory,
        parkDaysSkippedUnfinished,
        hourlyRowsWritten,
        ridesAggregated,
        unknownAttractions,
        unknownAttractionList: [...unknownAttractionNames.entries()].map(([externalId, name]) => ({ externalId, name })),
        failures,
        message: `Backfill finished: ${parkDaysProcessed} park-days processed, ${failures.length} failed, ${parkDaysSkippedUnfinished} skipped (day not finished)`,
    };
}
