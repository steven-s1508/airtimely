import { supabase } from "@/src/utils/supabase";
import { DateTime } from "luxon";
import getParkTimezone from "@/src/utils/helpers/getParkTimezone";

export interface ParkScheduleItem {
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
	entityType: string;
	timezone: string;
	schedule: ParkScheduleItem[];
}

export async function getParkSchedule(parkId: string, date?: string): Promise<ParkScheduleResponse | null> {
	try {
		const timezone = await getParkTimezone(parkId);
		if (!timezone) {
			return null;
		}
		const targetDate = date || DateTime.now().setZone(timezone).toISODate();

		// Get park info and schedule data
		const { data: parkData, error: parkError } = await supabase
			.from("parks")
			.select(
				`
                id,
                name,
                entity_type,
                timezone,
                parks_schedule!inner(
                    date,
                    type,
                    opening_time,
                    closing_time,
                    description,
                    purchases
                )
            `
			)
			.eq("id", parkId)
			.eq("parks_schedule.date", targetDate);

		if (parkError) {
			console.error(`Failed to fetch park schedule from database: ${parkError.message}`);
			return null;
		}

		if (!parkData || parkData.length === 0) {
			console.log(`No schedule data found for park ${parkId} on ${targetDate}`);
			return null;
		}

		const park = parkData[0];

		// Transform the data to match the expected interface
		const schedule: ParkScheduleItem[] = park.parks_schedule.map((item: any) => ({
			date: item.date,
			type: item.type,
			openingTime: item.opening_time,
			closingTime: item.closing_time,
			description: item.description,
			purchases: item.purchases || [],
		}));

		return {
			id: park.id,
			name: park.name,
			entityType: park.entity_type,
			timezone: park.timezone || "UTC",
			schedule,
		};
	} catch (error) {
		console.error("Error fetching park schedule from database:", error);
		return null;
	}
}

// Alternative function to get schedule for a date range
export async function getParkScheduleRange(parkId: string, startDate: string, endDate: string): Promise<ParkScheduleResponse | null> {
	try {
		const { data: parkData, error: parkError } = await supabase
			.from("parks")
			.select(
				`
                id,
                name,
                entity_type,
                timezone,
                parks_schedule!inner(
                    date,
                    type,
                    opening_time,
                    closing_time,
                    description,
                    purchases
                )
            `
			)
			.eq("id", parkId)
			.gte("parks_schedule.date", startDate)
			.lte("parks_schedule.date", endDate)
			.order("parks_schedule.date", { ascending: true });

		if (parkError) {
			console.error(`Failed to fetch park schedule range: ${parkError.message}`);
			return null;
		}

		if (!parkData || parkData.length === 0) {
			return null;
		}

		const park = parkData[0];
		const schedule: ParkScheduleItem[] = park.parks_schedule.map((item: any) => ({
			date: item.date,
			type: item.type,
			openingTime: item.opening_time,
			closingTime: item.closing_time,
			description: item.description,
			purchases: item.purchases || [],
		}));

		return {
			id: park.id,
			name: park.name,
			entityType: park.entity_type,
			timezone: park.timezone || "UTC",
			schedule,
		};
	} catch (error) {
		console.error("Error fetching park schedule range:", error);
		return null;
	}
}
