import { supabase } from "@/src/utils/supabase";

export interface ParkHours {
	park_id: string;
	date: string;
	opening_time: string | null;
	closing_time: string | null;
	type: string;
	is_open: boolean;
	local_current_time: string;
}

export async function getParkHours(parkId: string, date?: string): Promise<ParkHours | null> {
	try {
		const targetDate = date || new Date().toISOString().split("T")[0];

		// Get park hours for the date
		const { data: hours, error: hoursError } = await supabase.from("park_operating_hours").select("*").eq("park_id", parkId).eq("date", targetDate).eq("type", "OPERATING").order("created_at", { ascending: false }).limit(1);

		if (hoursError) {
			console.error("Error fetching park hours:", hoursError);
			return null;
		}

		if (!hours || hours.length === 0) {
			return null;
		}

		const parkHour = hours[0];

		// Check if park is currently open using database function
		const { data: isOpenResult, error: isOpenError } = await supabase.rpc("is_park_open", { p_park_id: parkId });

		if (isOpenError) {
			console.error("Error checking park open status:", isOpenError);
		}

		// Get park timezone for local time display
		const { data: park } = await supabase.from("parks").select("timezone").eq("id", parkId).single();

		// Calculate local current time
		let localCurrentTime = new Date().toISOString();
		if (park?.timezone) {
			try {
				localCurrentTime = new Intl.DateTimeFormat("en-CA", {
					timeZone: park.timezone,
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false,
				})
					.formatToParts(new Date())
					.reduce((acc, part) => {
						if (part.type === "year") return part.value + "-";
						if (part.type === "month") return acc + part.value + "-";
						if (part.type === "day") return acc + part.value + "T";
						if (part.type === "hour") return acc + part.value + ":";
						if (part.type === "minute") return acc + part.value + ":";
						if (part.type === "second") return acc + part.value;
						return acc;
					}, "");
			} catch (e) {
				console.error("Error converting to local time:", e);
			}
		}

		return {
			park_id: parkHour.park_id,
			date: parkHour.date,
			opening_time: parkHour.opening_time,
			closing_time: parkHour.closing_time,
			type: parkHour.type,
			is_open: isOpenResult || false,
			local_current_time: localCurrentTime,
		};
	} catch (error) {
		console.error("Error in getParkHours:", error);
		return null;
	}
}

export default getParkHours;
