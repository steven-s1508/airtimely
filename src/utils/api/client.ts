import { hc } from "hono/client";
import type { AppType } from "airtimely-server";

/**
 * Typed client for the Airtimely API.
 *
 * `AppType` is a type-only import from the server workspace — Babel erases it, so Metro
 * never resolves the package — and `hc` derives every route, param and payload from it.
 * A server change that breaks the app is a `tsc` error here, not a crash on a phone.
 */

const baseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!baseUrl) console.error("EXPO_PUBLIC_API_URL is not set; API requests will fail.");

const inFlight = new Map<string, Promise<Response>>();

/**
 * Shares one request between concurrent identical GETs.
 *
 * Several hooks read different slices of the same screen payload — the park screen's
 * rides, status and schedule all come from `/v1/parks/:id` — under their own query keys
 * and cache tiers. Without this, mounting that screen would fetch the same URL three
 * times. Each caller gets its own clone, because a body can only be read once.
 */
const sharedFetch: typeof fetch = (input, init) => {
	const method = (init?.method ?? "GET").toUpperCase();
	const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
	if (method !== "GET") return fetch(input, init);

	let pending = inFlight.get(url);
	if (!pending) {
		pending = fetch(input, init).finally(() => inFlight.delete(url));
		inFlight.set(url, pending);
	}
	return pending.then((res) => res.clone());
};

export const api = hc<AppType>(baseUrl ?? "", { fetch: sharedFetch });

/**
 * Reads a successful JSON body, throwing on anything else so React Query can retry
 * and keep showing the last good (persisted) data instead of an empty screen.
 */
export async function readJson<T>(res: {
	ok: boolean;
	status: number;
	url: string;
	text(): Promise<string>;
	json(): Promise<unknown>;
}): Promise<T> {
	if (!res.ok) {
		let detail = "";
		try {
			detail = await res.text();
		} catch {
			// Body already consumed or unreadable; the status is enough.
		}
		throw new Error(`API ${res.status} ${res.url}${detail ? `: ${detail}` : ""}`);
	}
	return (await res.json()) as T;
}
