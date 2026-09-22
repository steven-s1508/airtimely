import type { InferResponseType } from "hono/client";
import { api, readJson } from "./client";

/**
 * Open/closed as the UI displays it. The server resolves it from the park's schedule;
 * "Unknown" means the park publishes no schedule, not that the request failed.
 */
export type ParkStatus = "Open" | "Closed" | "Unknown";

/** The server's lowercase status, as the badges and sort order expect it. */
export function toParkStatus(status: "open" | "closed" | "unknown" | null | undefined): ParkStatus {
	switch (status) {
		case "open":
			return "Open";
		case "closed":
			return "Closed";
		default:
			return "Unknown";
	}
}

export type ParkPayload = InferResponseType<(typeof api.v1.parks)[":id"]["$get"], 200>;

/**
 * The park screen's single payload: park, schedule, status and every ride's live wait.
 * `useParkChildren`, `useParkStatus` and `useParkSchedule` each read a slice of it; the
 * client shares the request between them when they mount together.
 */
export async function getPark(parkId: string): Promise<ParkPayload> {
	return readJson<ParkPayload>(await api.v1.parks[":id"].$get({ param: { id: parkId } }));
}

export async function getParkStatus(parkId: string): Promise<ParkStatus> {
	const payload = await getPark(parkId);
	return toParkStatus(payload?.park.status);
}
