/** Resolves after `ms`, or immediately for non-positive values. */
export function sleep(ms: number): Promise<void> {
	return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/**
 * Spaces requests evenly regardless of how many callers are in flight.
 *
 * Reserving the next slot synchronously before awaiting is what makes this safe
 * under concurrency: four parallel park polls take four distinct slots rather than
 * all reading the same "last request" timestamp and firing together.
 */
export class RateLimiter {
	private nextSlot = 0;
	private readonly intervalMs: number;

	constructor(requestsPerSecond: number) {
		this.intervalMs = 1000 / requestsPerSecond;
	}

	async acquire(): Promise<void> {
		const now = Date.now();
		const slot = Math.max(now, this.nextSlot);
		this.nextSlot = slot + this.intervalMs;
		await sleep(slot - now);
	}
}

/**
 * Rolling-window budget for the history endpoints, which have their own allowance
 * (600/h with the free key) separate from the 300/min overall limit.
 *
 * Exhausting it is not something to wait out: finalisation retries nightly for up to
 * 30 days, so the job should stop cleanly and leave the park-day pending rather than
 * block a worker for an hour.
 */
export class RollingBudget {
	private hits: number[] = [];
	/** Set from `ratelimit-remaining`; the server's view wins over the local count. */
	private serverRemaining: number | null = null;
	private serverResetAt = 0;

	constructor(
		private readonly limit: number,
		private readonly windowMs: number,
	) {}

	private prune(now: number): void {
		const cutoff = now - this.windowMs;
		while (this.hits.length > 0 && this.hits[0]! <= cutoff) this.hits.shift();
		if (this.serverRemaining !== null && now >= this.serverResetAt) this.serverRemaining = null;
	}

	remaining(): number {
		const now = Date.now();
		this.prune(now);
		const local = this.limit - this.hits.length;
		return this.serverRemaining === null ? local : Math.min(local, this.serverRemaining);
	}

	record(): void {
		this.hits.push(Date.now());
	}

	/** Reconciles with `ratelimit-remaining` / `ratelimit-reset` response headers. */
	observeHeaders(headers: Headers): void {
		const remaining = Number(headers.get("ratelimit-remaining"));
		const reset = Number(headers.get("ratelimit-reset"));
		if (Number.isFinite(remaining)) {
			this.serverRemaining = remaining;
			this.serverResetAt = Date.now() + (Number.isFinite(reset) ? reset * 1000 : this.windowMs);
		}
	}
}
