import { serve } from "@hono/node-server";

import api from "./api/index.js";
import { sql } from "./db/index.js";
import { env } from "./env.js";
import { startCacheInvalidation } from "./lib/cache.js";
import { startWorker, stopWorker } from "./worker/index.js";

/** One image, two containers: APP_ROLE picks which half of the process tree runs. */
async function main(): Promise<void> {
	if (env.role === "api") {
		// Without this the cache still expires by TTL, so a subscription failure
		// degrades freshness rather than availability.
		await startCacheInvalidation();
		serve({ fetch: api.fetch, port: env.port });
		console.log(`[api] listening on :${env.port}`);
	} else {
		startWorker();
	}

	const shutdown = async (signal: string) => {
		console.log(`[${env.role}] ${signal} received, shutting down`);
		await stopWorker();
		await sql.end({ timeout: 5 });
		process.exit(0);
	};

	process.on("SIGTERM", () => void shutdown("SIGTERM"));
	process.on("SIGINT", () => void shutdown("SIGINT"));
}

await main();
