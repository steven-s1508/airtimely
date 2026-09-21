import { RateLimiter } from "./rateLimit.js";

const BASE_URL = "https://nominatim.openstreetmap.org/reverse";
/** Nominatim's usage policy is one request per second, absolute. */
const limiter = new RateLimiter(1);

export type GeocodeResult = {
	address?: { country_code?: string | null } & Record<string, unknown>;
} & Record<string, unknown>;

/**
 * Reverse-geocodes a coordinate to fill in `country_code` and `geocode_data`.
 *
 * Callers only ask when `geocode_data` is missing: a park does not move, so the
 * result is cached forever and the sync stays well inside the usage policy.
 * Returns null rather than throwing — a missing country code must never fail a
 * park sync.
 */
export async function reverseGeocode(
	latitude: number,
	longitude: number,
): Promise<GeocodeResult | null> {
	await limiter.acquire();
	try {
		const url = `${BASE_URL}?lat=${latitude}&lon=${longitude}&format=json&zoom=10`;
		const response = await fetch(url, {
			headers: { "User-Agent": "Airtimely/2 (hi@airtimely.app)" },
			signal: AbortSignal.timeout(20_000),
		});
		if (!response.ok) return null;
		return (await response.json()) as GeocodeResult;
	} catch {
		return null;
	}
}

/** Uppercase ISO country code from a geocode result, if it carried one. */
export function countryCodeOf(geocode: GeocodeResult | null): string | null {
	const code = geocode?.address?.country_code;
	return typeof code === "string" ? code.toUpperCase() : null;
}
