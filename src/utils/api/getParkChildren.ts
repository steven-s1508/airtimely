import { getPark } from "./getParkStatus";

export interface ParkChild {
	id: string;
	name: string;
	/** OPERATING, DOWN, CLOSED or REFURBISHMENT. */
	status: string | null;
	wait_time_minutes: number | null;
	single_rider_wait_time_minutes: number | null;
	last_updated: string | null;
}

export interface ParkChildrenResponse {
	attractions: ParkChild[];
}

/**
 * A park's rides with their live waits.
 *
 * Rides the poller has never seen are left out, as v1 did: with no state there is
 * nothing to show but an empty row.
 */
export async function getParkChildren(parkId: string): Promise<ParkChildrenResponse | null> {
	const payload = await getPark(parkId);
	if (!payload) return null;

	return {
		attractions: payload.rides
			.filter((ride) => ride.updatedAt !== null)
			.map((ride) => ({
				id: ride.id,
				name: ride.name,
				status: ride.status,
				wait_time_minutes: ride.waitMinutes,
				single_rider_wait_time_minutes: ride.singleRiderMinutes,
				last_updated: ride.updatedAt,
			})),
	};
}

export default getParkChildren;
