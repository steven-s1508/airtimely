/**
 * Package entry point. The Expo app imports `AppType` from here to get end-to-end
 * types through Hono's `hc` client — a type-only import, erased before Metro sees it.
 */

export type { AppType } from "./api/index.js";
