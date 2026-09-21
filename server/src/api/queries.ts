import { sql } from "../db/index.js";
import { RIDE_STATUS_BY_CODE } from "../db/schema/enums.js";
import type { RideStatusCode } from "../db/schema/enums.js";

/**
 * Screen-shaped reads.
 *
 * Open/closed is computed here rather than on the device. v1 shipped the park's
 * timezone and its raw opening hours to the phone and compared them there, which meant
 * every screen re-derived the same answer and any fix needed an app release.
 *
 * "unknown" is a real answer, distinct from "closed": a park with no schedule entry for
 * today has hours we do not know, and saying "Closed" would be a guess.
 */
export type ParkStatus = "open" | "closed" | "unknown";

export type ParkSummary = {
	id: string;
	name: string;
	slug: string | null;
	countryCode: string | null;
	timezone: string | null;
	status: ParkStatus;
	openingTime: string | null;
	closingTime: string | null;
};

/**
 * Today's operating window and whether it contains `now`, for a set of parks.
 *
 * Windows are read for local_date - 1 as well, because one may run past local midnight.
 * Each window is tested individually: a park with one window ending 02:00 and another
 * starting 10:00 must not read as open all night.
 */
const PARK_STATUS_SQL = sql`
	select
		p.id,
		coalesce(p.name_override, p.name) as name,
		p.slug,
		p.country_code as "countryCode",
		p.timezone,
		case
			when w.opens is null then 'unknown'
			when now() >= w.opens and now() < w.closes then 'open'
			else 'closed'
		end as status,
		w.opens as "openingTime",
		w.closes as "closingTime"
	from parks p
	left join lateral (
		select ps.opening_time as opens, ps.closing_time as closes
		from parks_schedule ps
		where ps.park_id = p.id
			and ps.type = 'OPERATING'
			and ps.opening_time is not null
			and ps.closing_time is not null
			and ps.local_date between
				(now() at time zone coalesce(p.timezone, 'UTC'))::date - 1 and
				(now() at time zone coalesce(p.timezone, 'UTC'))::date
			and ps.closing_time > now() - interval '12 hours'
		order by
			-- Prefer a window covering now; otherwise the next one starting.
			(now() >= ps.opening_time and now() < ps.closing_time) desc,
			ps.opening_time asc
		limit 1
	) w on true
`;

/** Destinations and standalone parks, as the home screen lists them. */
export type HomeEntity = {
	id: string;
	kind: "park" | "destination";
	name: string;
	countryCode: string | null;
	status: ParkStatus | null;
	parks: ParkSummary[];
};

export async function getHome(): Promise<{ entities: HomeEntity[] }> {
	const parks = await sql<(ParkSummary & { destinationId: string | null; isDestination: boolean })[]>`
		with status as (${PARK_STATUS_SQL})
		select
			s.*,
			p.destination_id as "destinationId",
			coalesce(p.is_destination, false) as "isDestination"
		from status s
		join parks p on p.id = s.id
		where p.is_active
		order by s.name
	`;

	const destinations = await sql<{ id: string; name: string; countryCode: string | null }[]>`
		select d.id, coalesce(d.name_override, d.name) as name, d.country_code as "countryCode"
		from destinations d
		order by name
	`;

	const byDestination = new Map<string, ParkSummary[]>();
	const standalone: HomeEntity[] = [];

	for (const park of parks) {
		const { destinationId, isDestination, ...summary } = park;
		// A destination with a single park is presented as that park.
		if (isDestination || !destinationId) {
			standalone.push({
				id: summary.id,
				kind: "park",
				name: summary.name,
				countryCode: summary.countryCode,
				status: summary.status,
				parks: [summary],
			});
			continue;
		}
		const list = byDestination.get(destinationId) ?? [];
		list.push(summary);
		byDestination.set(destinationId, list);
	}

	const groups: HomeEntity[] = [];
	for (const destination of destinations) {
		const children = byDestination.get(destination.id);
		if (!children || children.length === 0) continue;
		groups.push({
			id: destination.id,
			kind: "destination",
			name: destination.name,
			countryCode: destination.countryCode ?? children[0]?.countryCode ?? null,
			// A group is open when any of its parks is.
			status: children.some((p) => p.status === "open")
				? "open"
				: children.every((p) => p.status === "unknown")
					? "unknown"
					: "closed",
			parks: children,
		});
	}

	const entities = [...standalone, ...groups].sort((a, b) => a.name.localeCompare(b.name));
	return { entities };
}

export type ParkDetail = {
	park: ParkSummary & { schedule: { type: string; openingTime: string; closingTime: string }[] };
	rides: {
		id: string;
		name: string;
		status: string | null;
		waitMinutes: number | null;
		singleRiderMinutes: number | null;
		updatedAt: string | null;
	}[];
};

export async function getPark(parkId: string): Promise<ParkDetail | null> {
	const [park] = await sql<ParkSummary[]>`
		with status as (${PARK_STATUS_SQL})
		select s.* from status s join parks p on p.id = s.id
		where s.id = ${parkId}::uuid and p.is_active
	`;
	if (!park) return null;

	const [schedule, rides] = await Promise.all([
		sql<{ type: string; openingTime: string; closingTime: string }[]>`
			select ps.type::text as type, ps.opening_time as "openingTime", ps.closing_time as "closingTime"
			from parks_schedule ps
			where ps.park_id = ${parkId}::uuid
				and ps.opening_time is not null
				and ps.local_date >= (now() at time zone coalesce(
					(select timezone from parks where id = ${parkId}::uuid), 'UTC'))::date
			order by ps.opening_time
			limit 30
		`,
		sql<
			{
				id: string;
				name: string;
				status: number | null;
				waitMinutes: number | null;
				singleRiderMinutes: number | null;
				updatedAt: Date | null;
			}[]
		>`
			select
				r.id,
				r.name,
				l.status,
				l.wait_minutes as "waitMinutes",
				l.single_rider_minutes as "singleRiderMinutes",
				l.polled_at as "updatedAt"
			from rides r
			left join ride_live l on l.ride_id = r.id
			where r.park_id = ${parkId}::uuid and r.is_active
			order by r.name
		`,
	]);

	return {
		park: { ...park, schedule },
		rides: rides.map((r) => ({
			id: r.id,
			name: r.name,
			// Codes are storage; the wire carries names.
			status: r.status === null ? null : (RIDE_STATUS_BY_CODE[r.status as RideStatusCode] ?? null),
			waitMinutes: r.waitMinutes,
			singleRiderMinutes: r.singleRiderMinutes,
			updatedAt: r.updatedAt?.toISOString() ?? null,
		})),
	};
}

export type RideDetail = {
	id: string;
	name: string;
	parkId: string;
	parkName: string;
	timezone: string | null;
	live: {
		status: string | null;
		waitMinutes: number | null;
		singleRiderMinutes: number | null;
		updatedAt: string | null;
	} | null;
	/** Today's changes so far, park-local. Empty once the day is finalised. */
	today: { at: string; status: string | null; waitMinutes: number | null }[];
};

export async function getRide(rideId: string): Promise<RideDetail | null> {
	const [ride] = await sql<
		{
			id: string;
			name: string;
			parkId: string;
			parkName: string;
			timezone: string | null;
			status: number | null;
			waitMinutes: number | null;
			singleRiderMinutes: number | null;
			updatedAt: Date | null;
		}[]
	>`
		select
			r.id, r.name, r.park_id as "parkId",
			coalesce(p.name_override, p.name) as "parkName", p.timezone,
			l.status, l.wait_minutes as "waitMinutes",
			l.single_rider_minutes as "singleRiderMinutes", l.polled_at as "updatedAt"
		from rides r
		join parks p on p.id = r.park_id
		left join ride_live l on l.ride_id = r.id
		where r.id = ${rideId}::uuid
	`;
	if (!ride) return null;

	const today = await sql<{ at: Date; status: number | null; wait: number | null }[]>`
		select c.ts as at, c.status, c.wait
		from ride_changes c
		join parks p on p.id = (select park_id from rides where id = ${rideId}::uuid)
		where c.ride_id = ${rideId}::uuid
			and c.ts >= ((now() at time zone coalesce(p.timezone, 'UTC'))::date)::timestamp
				at time zone coalesce(p.timezone, 'UTC')
		order by c.ts
	`;

	return {
		id: ride.id,
		name: ride.name,
		parkId: ride.parkId,
		parkName: ride.parkName,
		timezone: ride.timezone,
		live: ride.updatedAt
			? {
					status:
						ride.status === null ? null : (RIDE_STATUS_BY_CODE[ride.status as RideStatusCode] ?? null),
					waitMinutes: ride.waitMinutes,
					singleRiderMinutes: ride.singleRiderMinutes,
					updatedAt: ride.updatedAt.toISOString(),
				}
			: null,
		today: today.map((t) => ({
			at: t.at.toISOString(),
			status: t.status === null ? null : (RIDE_STATUS_BY_CODE[t.status as RideStatusCode] ?? null),
			waitMinutes: t.wait,
		})),
	};
}
