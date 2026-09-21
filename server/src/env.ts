/**
 * Process configuration. Validated once at startup so a misconfigured container
 * fails immediately instead of at the first query.
 */

export type AppRole = "api" | "worker";

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function optional(name: string, fallback: string): string {
	return process.env[name] ?? fallback;
}

function parseRole(value: string): AppRole {
	if (value === "api" || value === "worker") return value;
	throw new Error(`APP_ROLE must be "api" or "worker", got: ${value}`);
}

export const env = {
	role: parseRole(optional("APP_ROLE", "api")),
	databaseUrl: required("DATABASE_URL"),
	port: Number(optional("PORT", "3000")),

	/** Free ThemeParks.wiki key: 30-day history window, 600 history requests/hour. */
	themeparksApiKey: process.env["THEMEPARKSWIKI_API_KEY"] ?? null,

	/** Dead-man ping (healthchecks.io / Uptime Kuma) hit after each successful live poll. */
	healthcheckPingUrl: process.env["HEALTHCHECK_PING_URL"] ?? null,
} as const;
