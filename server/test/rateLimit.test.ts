import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RateLimiter, RollingBudget } from "../src/lib/rateLimit.js";

describe("RateLimiter", () => {
	it("spaces concurrent callers instead of letting them fire together", async () => {
		const limiter = new RateLimiter(20); // 50ms apart
		const started = Date.now();

		// Four callers acquire in parallel: the naive "last request timestamp"
		// implementation would let all four through at once.
		const stamps = await Promise.all(
			[0, 1, 2, 3].map(async () => {
				await limiter.acquire();
				return Date.now() - started;
			}),
		);

		stamps.sort((a, b) => a - b);
		assert.ok(stamps[0]! < 25, `first should be immediate, was ${stamps[0]}`);
		// Fourth slot is reserved at 150ms; allow generous timer slop.
		assert.ok(stamps[3]! >= 120, `fourth should be delayed, was ${stamps[3]}`);
	});
});

describe("RollingBudget", () => {
	it("counts down and reports exhaustion", () => {
		const budget = new RollingBudget(3, 3_600_000);
		assert.equal(budget.remaining(), 3);
		budget.record();
		budget.record();
		assert.equal(budget.remaining(), 1);
		budget.record();
		assert.equal(budget.remaining(), 0);
	});

	it("lets the server's view override an optimistic local count", () => {
		const budget = new RollingBudget(600, 3_600_000);
		budget.record();
		assert.equal(budget.remaining(), 599);

		// The API says we have far less left than we think — its view wins.
		budget.observeHeaders(new Headers({ "ratelimit-remaining": "7", "ratelimit-reset": "600" }));
		assert.equal(budget.remaining(), 7);
	});

	it("expires entries once the window passes", () => {
		const budget = new RollingBudget(2, 50);
		budget.record();
		budget.record();
		assert.equal(budget.remaining(), 0);

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				assert.equal(budget.remaining(), 2);
				resolve();
			}, 80);
		});
	});
});
