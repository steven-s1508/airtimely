import { supabase } from "@/src/utils/supabase";

/**
 * Fetch destinations with optional pagination, field selection, and caching.
 * @param {Object} options
 * @param {number} [options.limit] - Max number of records to fetch.
 * @param {number} [options.offset] - Number of records to skip.
 * @param {string[]} [options.fields] - Fields to select.
 * @param {boolean} [options.useCache] - Whether to use cache.
 */
const destinationCache = new Map<string, any>();

export default async function getDestinations(
	options: {
		limit?: number;
		offset?: number;
		fields?: string[];
		useCache?: boolean;
	} = {}
) {
	const { limit, offset, fields, useCache } = options;
	const cacheKey = JSON.stringify({ limit, offset, fields });

	if (useCache) {
		if (destinationCache.has(cacheKey)) {
			return destinationCache.get(cacheKey);
		}
	}

	let query = supabase.from("destinations");
	if (fields && fields.length > 0) {
		query = query.select(fields.join(","));
	} else {
		query = query.select("*");
	}
	if (typeof limit === "number") {
		query = query.limit(limit);
	}
	if (typeof offset === "number") {
		query = query.range(offset, offset + (limit ?? 100) - 1);
	}
	const { data, error } = await query;
	if (error) {
		console.error("Error fetching destinations:", error);
		return [];
	}
	if (useCache) {
		destinationCache.set(cacheKey, data);
	}
	return data;
}
