import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { HistoryBudgetExhausted, ThemeParksClient, ThemeParksError } from "../src/lib/themeparks.js";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

/** Replaces fetch with a scripted sequence and records the requests made. */
function scriptFetch(replies: Reply[]): { calls: Request[] } {
	const calls: Request[] = [];
	let index = 0;
	globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
		calls.push(new Request(typeof input === "string" ? input : String(input), init));
		const reply = replies[Math.min(index++, replies.length - 1)]!;
		return Promise.resolve(
			new Response(reply.body === undefined ? "" : JSON.stringify(reply.body), {
				status: reply.status,
				headers: { "content-type": "application/json", ...reply.headers },
			}),
		);
	}) as typeof fetch;
	return { calls };
}

describe("ThemeParksClient", () => {
	it("treats 404 on history as 'nothing recorded', not an error", async () => {
		scriptFetch([{ status: 404, body: { error: "Entity history not found" } }]);
		const client = new ThemeParksClient("test-key");
		assert.equal(await client.history("park-1", "2026-09-12"), null);
	});

	it("still throws on 404 for a non-history endpoint", async () => {
		scriptFetch([{ status: 404, body: { error: "nope" } }]);
		const client = new ThemeParksClient("test-key");
		await assert.rejects(() => client.live("park-1"), ThemeParksError);
	});

	it("sends the API key only on history requests", async () => {
		const live = scriptFetch([{ status: 200, body: { id: "p", name: "P", liveData: [] } }]);
		const client = new ThemeParksClient("secret-key");
		await client.live("park-1");
		assert.equal(live.calls[0]!.headers.get("x-api-key"), null);
		assert.match(live.calls[0]!.headers.get("user-agent") ?? "", /^Airtimely\/2/);

		const hist = scriptFetch([{ status: 200, body: { id: "p", name: "P", entities: [] } }]);
		await client.history("park-1", "2026-09-12");
		assert.equal(hist.calls[0]!.headers.get("x-api-key"), "secret-key");
	});

	it("retries a 5xx and succeeds", async () => {
		const { calls } = scriptFetch([
			{ status: 503 },
			{ status: 200, body: { id: "p", name: "P", liveData: [] } },
		]);
		const client = new ThemeParksClient(null);
		const result = await client.live("park-1");
		assert.equal(calls.length, 2);
		assert.equal(result.id, "p");
	});

	it("gives up on a persistent 5xx rather than looping", async () => {
		const { calls } = scriptFetch([{ status: 500 }]);
		const client = new ThemeParksClient(null);
		await assert.rejects(() => client.live("park-1"), ThemeParksError);
		// 1 initial + 4 retries, then stop.
		assert.equal(calls.length, 5);
	});

	it("honours retryAfter from a 429 body", async () => {
		const { calls } = scriptFetch([
			{ status: 429, body: { error: { retryAfter: 0 } } },
			{ status: 200, body: { id: "p", name: "P", liveData: [] } },
		]);
		const client = new ThemeParksClient(null);
		await client.live("park-1");
		assert.equal(calls.length, 2);
	});

	it("stops rather than waiting when the history budget is spent", async () => {
		// The server tells us we have nothing left; the next call must not be made.
		const { calls } = scriptFetch([
			{
				status: 200,
				body: { id: "p", name: "P", entities: [] },
				headers: { "ratelimit-remaining": "0", "ratelimit-reset": "3600" },
			},
		]);
		const client = new ThemeParksClient("k");

		await client.history("park-1", "2026-09-12");
		assert.equal(client.historyRemaining(), 0);

		await assert.rejects(
			() => client.history("park-2", "2026-09-12"),
			HistoryBudgetExhausted,
		);
		// Still 1: the second call never reached the network.
		assert.equal(calls.length, 1);
	});
});
