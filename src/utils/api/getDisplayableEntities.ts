import type { InferResponseType } from "hono/client";
import { api, readJson } from "./client";
import { toParkStatus, type ParkStatus } from "./getParkStatus";

type HomePayload = InferResponseType<typeof api.v1.home.$get, 200>;
type ServerPark = HomePayload["entities"][number]["parks"][number];

export type ParkWithStatus = Omit<ServerPark, "status"> & { status: ParkStatus };

/**
 * One home-screen card: either a destination grouping several parks, or a single park.
 *
 * `id` is what gets pinned. It is the park's id for a standalone park and the
 * destination's id for a group — the same ids v1's `displayable_destinations` view
 * exposed as `entity_id`, so pins saved before the migration still match.
 */
export type DisplayableEntity = {
	id: string;
	kind: "park" | "destination";
	name: string;
	countryCode: string | null;
	status: ParkStatus;
	parks: ParkWithStatus[];
};

/** The home screen in one call: every card with open/closed already resolved. */
export async function fetchDisplayableEntities(): Promise<DisplayableEntity[]> {
	const { entities } = await readJson<HomePayload>(await api.v1.home.$get());

	return entities.map((entity) => ({
		id: entity.id,
		kind: entity.kind,
		name: entity.name,
		countryCode: entity.countryCode,
		status: toParkStatus(entity.status),
		parks: entity.parks.map((park) => ({ ...park, status: toParkStatus(park.status) })),
	}));
}
