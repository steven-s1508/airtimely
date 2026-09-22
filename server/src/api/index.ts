import { Hono } from "hono";
import type { Context, TypedResponse } from "hono";
import { validator } from "hono/validator";

import { sql } from "../db/index.js";
import { cached } from "../lib/cache.js";
import { getHome, getPark, getRide } from "./queries.js";
import { getRideDay, getRideMonth, getRideStats } from "./statsQueries.js";

/** A poll is late once it is this far past the 5-minute cadence. */
const POLL_STALE_MS = 15 * 60 * 1000;

/**
 * Cache lifetimes, in seconds.
 *
 * Anything carrying live waits is evicted by NOTIFY the moment a poll changes it, so
 * these are ceilings for a missed notification rather than the primary mechanism.
 * Historical aggregates only change once a night, at finalisation.
 */
const TTL = {
	live: 300,
	schedule: 900,
	historical: 3600,
	config: 3600,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Serves a cached body with an ETag, answering 304 when the client already has it.
 *
 * Phones re-open the same screens constantly; a 304 costs a few bytes instead of a
 * full payload, and the response never touches the database either way.
 *
 * The body is pre-serialised by the cache, so the return is typed by hand: that type
 * is what the app's `hc` client infers each endpoint's payload from.
 */
async function serve<T>(
	c: Context,
	key: string,
	tags: string[],
	ttlSeconds: number,
	build: () => Promise<T>,
): Promise<Response & TypedResponse<T, 200, "json">> {
	const { body, etag, hit } = await cached(key, tags, ttlSeconds, build);

	c.header("Cache-Control", `public, max-age=${ttlSeconds}`);
	c.header("ETag", etag);
	c.header("X-Cache", hit ? "HIT" : "MISS");

	type Typed = Response & TypedResponse<T, 200, "json">;
	if (c.req.header("if-none-match") === etag) return c.body(null, 304) as unknown as Typed;

	c.header("Content-Type", "application/json; charset=utf-8");
	return c.body(body, 200) as unknown as Typed;
}

/** Optional `?year=`, for the by-year charts. */
const yearQuery = validator("query", (value, c) => {
	const raw = value["year"];
	if (raw === undefined) return {} as { year?: string };
	const year = Number(raw);
	if (typeof raw !== "string" || !Number.isInteger(year) || year < 2000 || year > 2100) {
		return c.json({ error: "invalid year" }, 400);
	}
	return { year: raw } as { year?: string };
});

/** Required `?date=YYYY-MM-DD`. */
const dateQuery = validator("query", (value, c) => {
	const raw = value["date"];
	if (typeof raw !== "string" || !ISO_DATE.test(raw)) {
		return c.json({ error: "date=YYYY-MM-DD required" }, 400);
	}
	return { date: raw };
});

/** Required `?month=YYYY-MM`. */
const monthQuery = validator("query", (value, c) => {
	const raw = value["month"];
	if (typeof raw !== "string" || !ISO_MONTH.test(raw)) {
		return c.json({ error: "month=YYYY-MM required" }, 400);
	}
	return { month: raw };
});

type HealthRow = {
	last_ok: Date | null;
	last_attempt: Date | null;
	last_error: string | null;
};

/**
 * Read-only public API. No auth: the data is public and identical for every user.
 * Endpoints are shaped around screens, not tables — v1 chained two or three round
 * trips per screen and computed park open/closed on the device.
 */
const app = new Hono()
	/**
	 * Liveness plus a real staleness check. Reporting only "the database answered" is
	 * what a dead pipeline looks like from the outside — v1 had no check at all and a
	 * Windmill crash went unnoticed for four days.
	 */
	.get("/health", async (c) => {
		const startedAt = Date.now();
		let row: HealthRow | undefined;

		try {
			[row] = await sql<HealthRow[]>`
				select
					max(started_at) filter (where ok) as last_ok,
					max(started_at) as last_attempt,
					(array_agg(error order by started_at desc) filter (where ok is false))[1] as last_error
				from job_runs
				where job = 'live_poll' and started_at > now() - interval '1 day'
			`;
		} catch (error) {
			return c.json(
				{ ok: false, error: error instanceof Error ? error.message : String(error) },
				503,
			);
		}

		const lastOk = row?.last_ok ?? null;
		const pollAgeMs = lastOk ? Date.now() - lastOk.getTime() : null;
		const pollHealthy = pollAgeMs !== null && pollAgeMs < POLL_STALE_MS;

		return c.json(
			{
				ok: pollHealthy,
				dbLatencyMs: Date.now() - startedAt,
				lastSuccessfulPoll: lastOk?.toISOString() ?? null,
				pollAgeSeconds: pollAgeMs === null ? null : Math.round(pollAgeMs / 1000),
				lastPollError: row?.last_error ?? null,
			},
			pollHealthy ? 200 : 503,
		);
	})

	/** Minimum supported app version; the client blocks below this. */
	.get("/v1/config", (c) =>
		serve(c, "config", [], TTL.config, () =>
			Promise.resolve({ minAppVersion: process.env["MIN_APP_VERSION"] ?? "0.0.0" }),
		),
	)

	/** Destinations and parks with open/closed already resolved. */
	.get("/v1/home", (c) => serve(c, "home", [], TTL.schedule, getHome))

	/** Park, its upcoming schedule, and every ride with its live wait. */
	.get("/v1/parks/:id", async (c) => {
		const id = c.req.param("id");
		if (!UUID.test(id)) return c.json({ error: "invalid park id" }, 400);

		const [row] = await sql<{ id: string }[]>`
			select id from parks where id = ${id}::uuid and is_active
		`;
		if (!row) return c.json({ error: "park not found" }, 404);
		return serve(c, `park:${id}`, [id], TTL.live, () => getPark(id));
	})

	/** Ride, its live state, and today's changes so far. */
	.get("/v1/rides/:id", async (c) => {
		const id = c.req.param("id");
		if (!UUID.test(id)) return c.json({ error: "invalid ride id" }, 400);

		const [row] = await sql<{ park_id: string }[]>`
			select park_id from rides where id = ${id}::uuid
		`;
		if (!row) return c.json({ error: "ride not found" }, 404);
		return serve(c, `ride:${id}`, [row.park_id], TTL.live, () => getRide(id));
	})

	/**
	 * Historical aggregates. Separate from the ride itself because the two have
	 * different lifetimes — live state moves every five minutes, these change once a
	 * night — and one endpoint would force the client to choose which to get wrong.
	 */
	.get("/v1/rides/:id/stats", yearQuery, (c) => {
		const id = c.req.param("id");
		if (!UUID.test(id)) return c.json({ error: "invalid ride id" }, 400);

		const { year: rawYear } = c.req.valid("query");
		const year = rawYear === undefined ? null : Number(rawYear);

		return serve(c, `stats:${id}:${year ?? "all"}`, [], TTL.historical, () =>
			getRideStats(id, year),
		);
	})

	/** One past day's wait curve. */
	.get("/v1/rides/:id/day", dateQuery, (c) => {
		const id = c.req.param("id");
		if (!UUID.test(id)) return c.json({ error: "invalid ride id" }, 400);

		const { date } = c.req.valid("query");
		return serve(c, `day:${id}:${date}`, [], TTL.historical, () => getRideDay(id, date));
	})

	/** Daily means for each day of one calendar month — the ride screen's month chart. */
	.get("/v1/rides/:id/month", monthQuery, (c) => {
		const id = c.req.param("id");
		if (!UUID.test(id)) return c.json({ error: "invalid ride id" }, 400);

		const { month } = c.req.valid("query");
		return serve(c, `month:${id}:${month}`, [], TTL.historical, () => getRideMonth(id, month));
	});

export type AppType = typeof app;
export default app;
