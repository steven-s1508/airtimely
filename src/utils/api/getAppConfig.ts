import type { InferResponseType } from "hono/client";
import { api, readJson } from "./client";

export type AppConfig = InferResponseType<typeof api.v1.config.$get, 200>;

/** Server-side app settings; currently the minimum version the API still supports. */
export async function getAppConfig(): Promise<AppConfig> {
	return readJson<AppConfig>(await api.v1.config.$get());
}

/**
 * Whether `version` is older than `minimum`, comparing dotted numeric segments
 * (1.10.0 is newer than 1.9.3). Missing segments count as 0; anything unparseable is
 * treated as supported, so a malformed setting can never lock every user out.
 */
export function isVersionBelow(version: string, minimum: string): boolean {
	const parse = (v: string) => v.split(".").map((part) => Number.parseInt(part, 10));
	const a = parse(version);
	const b = parse(minimum);
	if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;

	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const diff = (a[i] ?? 0) - (b[i] ?? 0);
		if (diff !== 0) return diff < 0;
	}
	return false;
}
