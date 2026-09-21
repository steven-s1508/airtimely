import { createHash } from "node:crypto";

import { sql } from "../db/index.js";

/**
 * In-process response cache.
 *
 * The data is public and identical for every user, so one entry serves everybody and
 * database load stops depending on user count. No Redis: a single api process needs
 * none, and if there is ever a second one a CDN in front beats a shared cache.
 *
 * Entries carry tags — park ids — so a poll can evict exactly what it changed rather
 * than flushing everything.
 */

const MAX_ENTRIES = 500;

type Entry = {
	body: string;
	etag: string;
	expiresAt: number;
	tags: string[];
};

const entries = new Map<string, Entry>();
const keysByTag = new Map<string, Set<string>>();

function etagOf(body: string): string {
	return `W/"${createHash("sha1").update(body).digest("base64url")}"`;
}

function dropKey(key: string): void {
	const entry = entries.get(key);
	if (!entry) return;
	entries.delete(key);
	for (const tag of entry.tags) {
		const set = keysByTag.get(tag);
		if (!set) continue;
		set.delete(key);
		if (set.size === 0) keysByTag.delete(tag);
	}
}

export function invalidateTag(tag: string): number {
	const keys = keysByTag.get(tag);
	if (!keys) return 0;
	const count = keys.size;
	for (const key of [...keys]) dropKey(key);
	return count;
}

export function clearCache(): void {
	entries.clear();
	keysByTag.clear();
}

export function cacheStats(): { entries: number; tags: number } {
	return { entries: entries.size, tags: keysByTag.size };
}

/**
 * Returns a cached body, or builds and stores one.
 *
 * `ttlSeconds` is a ceiling, not the primary mechanism: live data is evicted by
 * NOTIFY as soon as a poll changes it, and the TTL only bounds how stale something
 * can get if a notification is ever missed.
 */
export async function cached<T>(
	key: string,
	tags: string[],
	ttlSeconds: number,
	build: () => Promise<T>,
): Promise<{ body: string; etag: string; hit: boolean }> {
	const now = Date.now();
	const existing = entries.get(key);
	if (existing && existing.expiresAt > now) {
		// Refresh LRU position.
		entries.delete(key);
		entries.set(key, existing);
		return { body: existing.body, etag: existing.etag, hit: true };
	}

	const body = JSON.stringify(await build());
	const entry: Entry = { body, etag: etagOf(body), expiresAt: now + ttlSeconds * 1000, tags };

	dropKey(key);
	entries.set(key, entry);
	for (const tag of tags) {
		let set = keysByTag.get(tag);
		if (!set) {
			set = new Set();
			keysByTag.set(tag, set);
		}
		set.add(key);
	}

	// Evict least-recently-used once over the ceiling.
	while (entries.size > MAX_ENTRIES) {
		const oldest = entries.keys().next();
		if (oldest.done) break;
		dropKey(oldest.value);
	}

	return { body, etag: entry.etag, hit: false };
}

let listening = false;

/**
 * Subscribes to the worker's post-poll notifications.
 *
 * postgres.js gives `listen` its own dedicated connection and reconnects on its own.
 * A failure here is not fatal: without notifications the cache still expires by TTL,
 * so the API degrades to slightly staler data rather than going down.
 */
export async function startCacheInvalidation(): Promise<void> {
	if (listening) return;
	listening = true;
	try {
		await sql.listen("airtimely_poll", (payload) => {
			const evicted = invalidateTag(payload);
			if (evicted > 0) console.log(`[cache] evicted ${evicted} entries for park ${payload}`);
		});
		console.log("[cache] listening on airtimely_poll");
	} catch (error) {
		listening = false;
		console.error("[cache] could not subscribe; falling back to TTL only", error);
	}
}
