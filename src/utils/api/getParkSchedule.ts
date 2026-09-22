import { getPark } from "./getParkStatus";

export interface ParkScheduleItem {
	/** Park-local date, YYYY-MM-DD. */
	date: string;
	type: "OPERATING" | "INFO" | "TICKETED_EVENT" | "EXTRA_HOURS";
	openingTime?: string;
	closingTime?: string;
	description?: string;
	purchases?: Array<{
		id: string;
		name: string;
		type: string;
		price: {
			amount: number;
			currency: string;
			formatted: string;
		};
		available?: boolean;
	}>;
}

export interface ParkScheduleResponse {
	id: string;
	name: string;
	/** IANA zone the schedule's `date`s are local to. */
	timezone: string;
	schedule: ParkScheduleItem[];
}

/** A park's schedule from today onward, with the timezone its dates are local to. */
export async function getParkSchedule(parkId: string): Promise<ParkScheduleResponse | null> {
	const payload = await getPark(parkId);
	if (!payload) return null;

	const { park } = payload;
	return {
		id: park.id,
		name: park.name,
		timezone: park.timezone ?? "UTC",
		schedule: park.schedule.map((entry) => ({
			date: entry.localDate,
			type: entry.type as ParkScheduleItem["type"],
			openingTime: entry.openingTime ?? undefined,
			closingTime: entry.closingTime ?? undefined,
			description: entry.description ?? undefined,
			purchases: entry.purchases as ParkScheduleItem["purchases"],
		})),
	};
}
