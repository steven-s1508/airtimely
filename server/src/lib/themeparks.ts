import { env } from "../env.js";
import { RateLimiter, RollingBudget, sleep } from "./rateLimit.js";

const BASE_URL = "https://api.themeparks.wiki/v1";
const USER_AGENT = "Airtimely/2 (hi@airtimely.app)";

/** Overall allowance is 300/min; 5/s leaves headroom and matches the 5-min poll cadence. */
const REQUESTS_PER_SECOND = 5;
/** History endpoints have their own budget: 600/h with the free key. */
const HISTORY_LIMIT_PER_HOUR = 600;

const MAX_ERROR_RETRIES = 4;
const MAX_RATE_LIMIT_WAITS = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
/** History responses reach ~1.6 MB for a large park. */
const HISTORY_TIMEOUT_MS = 90_000;

export type LiveStatus = "OPERATING" | "DOWN" | "CLOSED" | "REFURBISHMENT";

export type LiveQueue = {
	STANDBY?: { waitTime?: number | null } | null;
	SINGLE_RIDER?: { waitTime?: number | null } | null;
};

export type LiveShowTime = {
	type: string;
	startTime?: string | null;
	endTime?: string | null;
};

export type EntityLiveData = {
	id: string;
	name: string;
	entityType: string;
	status?: LiveStatus | null;
	lastUpdated?: string | null;
	queue?: LiveQueue | null;
	showtimes?: LiveShowTime[] | null;
};

export type EntityLiveDataResponse = {
	id: string;
	name: string;
	entityType: string;
	timezone?: string;
	liveData?: EntityLiveData[];
};

export type ScheduleEntry = {
	date: string;
	type: string;
	openingTime?: string | null;
	closingTime?: string | null;
	description?: string | null;
	purchases?: unknown;
};

export type EntityScheduleResponse = {
	id: string;
	name: string;
	timezone?: string;
	schedule?: ScheduleEntry[];
};

export type EntityData = {
	id: string;
	name: string;
	entityType: string;
	slug?: string | null;
	parentId?: string | null;
	destinationId?: string | null;
	timezone: string;
	location?: { latitude?: number | null; longitude?: number | null } | null;
};

export type DestinationEntry = {
	id: string;
	name: string;
	slug?: string | null;
	parks?: { id: string; name: string }[];
};

export type DestinationsResponse = {
	destinations?: DestinationEntry[];
};

export type EntityChild = {
	id: string;
	name: string;
	entityType: string;
	slug?: string | null;
	externalId?: string | null;
	location?: { latitude?: number | null; longitude?: number | null } | null;
};

export type EntityChildrenResponse = {
	id: string;
	name: string;
	children?: EntityChild[];
};

/** One state the entity held, valid until the next row. */
export type HistoryRow = {
	time: string;
	status?: LiveStatus | null;
	queue?: LiveQueue | null;
};

export type HistoryEntity = {
	id: string;
	name: string;
	entityType: string;
	/** The state at the start of the requested local day. */
	opening?: (HistoryRow & { time: string }) | null;
	history?: HistoryRow[];
};

/** One day's summary for one entity, as the API computes it. */
export type HistoryDailyDay = {
	date: string;
	firstOperatingAt?: string | null;
	lastClosedAt?: string | null;
	/** Minutes the entity was OPERATING. Not clipped to park opening hours. */
	operatingMinutes?: number | null;
	downMinutes?: number | null;
	standby?: {
		min?: number | null;
		max?: number | null;
		mean?: number | null;
		p50?: number | null;
		p90?: number | null;
	} | null;
	changes?: number | null;
};

/**
 * The API's own minute-weighted daily summaries, computed independently of us from
 * the same change logs. The closest thing to an oracle this system has.
 */
export type HistoryDailyEntity = {
	id: string;
	name: string;
	entityType: string;
	coverage?: { firstRecordedAt?: string | null } | null;
	days?: HistoryDailyDay[];
};

export type HistoryDailyResponse = {
	id: string;
	name: string;
	entityType: string;
	timezone?: string;
	range?: unknown;
	entities?: HistoryDailyEntity[];
	/** Pagination cursor; null on the last page. */
	next?: string | null;
};

export type HistoryResponse = {
	id: string;
	name: string;
	timezone?: string;
	entities?: HistoryEntity[];
};

/** Thrown when the history allowance is spent. Callers should stop, not wait. */
export class HistoryBudgetExhausted extends Error {
	constructor(remaining: number) {
		super(`ThemeParks history budget exhausted (remaining: ${remaining})`);
		this.name = "HistoryBudgetExhausted";
	}
}

export class ThemeParksError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "ThemeParksError";
	}
}

type FetchOptions = {
	/** History endpoints authenticate and draw on their own budget. */
	history?: boolean;
	timeoutMs?: number;
	/** Treat 404 as "nothing recorded" and return null rather than throwing. */
	nullOn404?: boolean;
};

export class ThemeParksClient {
	private readonly limiter = new RateLimiter(REQUESTS_PER_SECOND);
	private readonly historyBudget = new RollingBudget(HISTORY_LIMIT_PER_HOUR, 3_600_000);

	constructor(private readonly apiKey: string | null = env.themeparksApiKey) {}

	/** Remaining history requests in the rolling hour, reconciled with server headers. */
	historyRemaining(): number {
		return this.historyBudget.remaining();
	}

	private async request<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
		const { history = false, nullOn404 = false } = options;
		const timeoutMs = options.timeoutMs ?? (history ? HISTORY_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

		if (history && this.historyBudget.remaining() <= 0) {
			throw new HistoryBudgetExhausted(this.historyBudget.remaining());
		}

		const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "application/json" };
		if (history && this.apiKey) headers["X-API-Key"] = this.apiKey;

		let errorRetries = 0;
		let rateLimitWaits = 0;

		for (;;) {
			await this.limiter.acquire();
			if (history) this.historyBudget.record();

			let response: Response;
			try {
				response = await fetch(`${BASE_URL}${path}`, {
					headers,
					signal: AbortSignal.timeout(timeoutMs),
				});
			} catch (cause) {
				// Network failure or timeout: same backoff as a 5xx.
				if (errorRetries >= MAX_ERROR_RETRIES) {
					throw new ThemeParksError(
						`${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
						0,
					);
				}
				await sleep(2 ** errorRetries++ * 1000);
				continue;
			}

			if (history) this.historyBudget.observeHeaders(response.headers);

			if (response.ok) return (await response.json()) as T;

			// 404 on history means the entity recorded nothing that day, not a failure.
			if (response.status === 404 && nullOn404) return null;

			if (response.status === 429) {
				if (rateLimitWaits >= MAX_RATE_LIMIT_WAITS) {
					throw new ThemeParksError(`${path}: rate limited`, 429);
				}
				await sleep((await retryAfterSeconds(response)) * 1000 + 1000);
				rateLimitWaits++;
				continue;
			}

			if (response.status >= 500) {
				if (errorRetries >= MAX_ERROR_RETRIES) {
					throw new ThemeParksError(`${path}: ${response.status}`, response.status);
				}
				await sleep(2 ** errorRetries++ * 1000);
				continue;
			}

			const body = (await response.text()).slice(0, 300);
			throw new ThemeParksError(`${path}: ${response.status} ${body}`, response.status);
		}
	}

	async live(entityId: string): Promise<EntityLiveDataResponse> {
		return (await this.request<EntityLiveDataResponse>(`/entity/${entityId}/live`))!;
	}

	async destinations(): Promise<DestinationsResponse> {
		return (await this.request<DestinationsResponse>("/destinations"))!;
	}

	async entity(entityId: string): Promise<EntityData> {
		return (await this.request<EntityData>(`/entity/${entityId}`))!;
	}

	async schedule(entityId: string): Promise<EntityScheduleResponse> {
		return (await this.request<EntityScheduleResponse>(`/entity/${entityId}/schedule`))!;
	}

	async children(entityId: string): Promise<EntityChildrenResponse> {
		return (await this.request<EntityChildrenResponse>(`/entity/${entityId}/children`))!;
	}

	/**
	 * The API's own daily summaries for a park over a date range (max 31 days/page).
	 * Minute-weighted, computed independently of us — the oracle job 3 compares against.
	 */
	async historyDaily(
		entityId: string,
		from: string,
		to: string,
	): Promise<HistoryDailyResponse | null> {
		return this.request<HistoryDailyResponse>(
			`/entity/${entityId}/history/daily?from=${from}&to=${to}`,
			{ history: true, nullOn404: true },
		);
	}

	/** One park, one local day, one budget unit. Null when the API recorded nothing. */
	async history(entityId: string, date: string): Promise<HistoryResponse | null> {
		return this.request<HistoryResponse>(`/entity/${entityId}/history?date=${date}`, {
			history: true,
			nullOn404: true,
		});
	}
}

/** Reads the retry delay the API asked for, preferring its body over the header. */
async function retryAfterSeconds(response: Response): Promise<number> {
	try {
		const body = (await response.clone().json()) as {
			error?: { retryAfter?: number };
			retryAfter?: number;
		};
		const fromBody = body.error?.retryAfter ?? body.retryAfter;
		if (typeof fromBody === "number") return fromBody;
	} catch {
		// Non-JSON body; fall through to the headers.
	}
	const header = Number(response.headers.get("retry-after") ?? response.headers.get("ratelimit-reset"));
	return Number.isFinite(header) && header > 0 ? header : 60;
}

export const themeparks = new ThemeParksClient();
