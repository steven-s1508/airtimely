import { supabase } from "@/src/utils/supabase";
import { DateTime } from "luxon";
import getParkTimezone from "@/src/utils/helpers/getParkTimezone";
import getParkOperatingHours from "../helpers/getParkOperatingHours";

// Get available live ride statistics with timezone conversion (more robust version)
export async function getLiveRideStatisticsWithTimezone(rideId: string, parkId?: string) {
	// If parkId is not provided, fetch it from the ride data
	if (!parkId) {
		const { data: rideData, error: rideError } = await supabase.from("rides").select("park_id").eq("id", rideId).single();
		if (rideError || !rideData) {
			console.error("Error fetching ride data:", rideError);
			return { waitTimeData: [], waitTimeError: rideError };
		}
		parkId = rideData.park_id;
	}

	// Complex query to get wait times only during park operating hours
	const { data: waitTimeData, error: waitTimeError } = await supabase
		.from("ride_wait_times")
		.select(
			`
			status,
			wait_time_minutes,
			single_rider_wait_time_minutes,
			recorded_at_local,
			rides!inner(
				park_id,
				parks!inner(timezone)
			)
			`
		)
		.eq("ride_id", rideId)
		// Filter for today's records, recorded_at_local is stored in correct timezone
		.order("recorded_at_local", { ascending: true });

	if (waitTimeError || !waitTimeData || waitTimeData.length === 0) {
		return { waitTimeData, waitTimeError };
	}

	// Get park info from the first record
	const parkTimezone = waitTimeData[0].rides.parks.timezone;

	if (!parkId || !parkTimezone) {
		console.error("Could not determine park ID or timezone from ride data.");
		return { waitTimeData: [], waitTimeError: null };
	}

	// Get today's operating hours for the park (in park's local date)
	const todayInParkTZ = DateTime.now().setZone(parkTimezone).toISODate() || DateTime.now().toISODate();
	const { data: operatingHours, error: hoursError } = await supabase.from("park_operating_hours").select("opening_time, closing_time").eq("park_id", parkId).eq("date", todayInParkTZ).eq("type", "OPERATING").order("created_at", { ascending: false }).limit(1).single();

	if (hoursError || !operatingHours || !operatingHours.opening_time || !operatingHours.closing_time) {
		console.log(`No operating hours found for park ${parkId} on ${todayInParkTZ}.`);
		return { waitTimeData: [], waitTimeError: null };
	}

	// Filter wait times to only include those during operating hours
	const filteredWaitTimeData = waitTimeData.filter((record) => {
		if (!record.recorded_at_local) return false;

		// Parse record time and set to park's timezone for comparison
		// The recorded_at_local is stored as UTC string but represents local park time
		const recordDateTime = DateTime.fromISO(record.recorded_at_local).setZone(parkTimezone, { keepLocalTime: true });
		if (!recordDateTime.isValid) return false;

		if (recordDateTime.toISODate() !== todayInParkTZ) {
			return false;
		}

		const openingDateTime = DateTime.fromISO(`${operatingHours.opening_time}`, { zone: parkTimezone });
		const closingDateTime = DateTime.fromISO(`${operatingHours.closing_time}`, { zone: parkTimezone });

		if (!openingDateTime.isValid || !closingDateTime.isValid) {
			console.error("Invalid opening/closing time format from DB.");
			return false;
		}

		// Handle the case where park operates past midnight (closing time is earlier than opening time)
		// This includes cases where closing time is 00:00 (midnight)
		if (closingDateTime < openingDateTime) {
			// Park operates past midnight - check if record time is either:
			// 1. After opening time today, or
			// 2. Before closing time (which is effectively next day)
			return recordDateTime >= openingDateTime || recordDateTime <= closingDateTime;
		} else {
			// Normal case - closing time is on the same day
			return recordDateTime >= openingDateTime && recordDateTime <= closingDateTime;
		}
	});

	// This version keeps the original structure but times are effectively in park zone for logic
	const dataWithParkTimezone = filteredWaitTimeData.map((record) => ({
		...record,
		// recorded_at_local remains UTC, but other times could be converted if needed for display
		// For example, to show the local time at the park:
		// recorded_at_local_park_time: DateTime.fromISO(record.recorded_at_local).setZone(parkTimezone).toISO()
	}));

	return { waitTimeData: dataWithParkTimezone, waitTimeError: null };
}

// Get all-time average hourly wait times for hours where the park is open
export async function getAllTimeAverageHourlyWaitTimes(rideId: string): Promise<{ averageStandbyWaitTimes: number[]; averageSingleRiderWaitTimes: number[] }> {
	const { data, error } = await supabase.from("daily_ride_statistics").select("hourly_data").eq("ride_id", rideId);

	if (error || !data) {
		console.error("Error fetching all-time average hourly wait times:", error);
		return { averageStandbyWaitTimes: [], averageSingleRiderWaitTimes: [] };
	}

	const standbySums: number[] = Array(24).fill(0);
	const standbyCounts: number[] = Array(24).fill(0);
	const singleSums: number[] = Array(24).fill(0);
	const singleCounts: number[] = Array(24).fill(0);

	data.forEach((record) => {
		const hourlyArray = record.hourly_data as { h: number; avg: number | null; avg_s: number | null }[];
		hourlyArray.forEach((entry) => {
			const hour = entry.h;
			if (entry.avg !== null && !isNaN(entry.avg)) {
				standbySums[hour] += entry.avg;
				standbyCounts[hour] += 1;
			}
			if (entry.avg_s !== null && !isNaN(entry.avg_s)) {
				singleSums[hour] += entry.avg_s;
				singleCounts[hour] += 1;
			}
		});
	});

	const averageStandbyWaitTimes = standbySums.map((sum, hour) => (standbyCounts[hour] > 0 ? parseFloat((sum / standbyCounts[hour]).toFixed(2)) : 0));
	const averageSingleRiderWaitTimes = singleSums.map((sum, hour) => (singleCounts[hour] > 0 ? parseFloat((sum / singleCounts[hour]).toFixed(2)) : 0));

	return { averageStandbyWaitTimes, averageSingleRiderWaitTimes };
}

// Get all daily wait times and calculate average for days of the week
export async function getWeekdayAverageWaitTimes(rideId: string): Promise<{ weeklyAverageWaitTimes: number[] }> {
	const { data, error } = await supabase.from("daily_ride_statistics").select("date, avg_wait_time_minutes").eq("ride_id", rideId);

	console.log("--------------------------------");

	if (error) {
		console.error("Error fetching weekly average wait times:", error);
		return { weeklyAverageWaitTimes: [] };
	}

	let waitTimesAvg: {
		[key: number]: {
			total: number;
			count: number;
		};
	} = {
		1: {
			total: 0,
			count: 0,
		},
		2: {
			total: 0,
			count: 0,
		},
		3: {
			total: 0,
			count: 0,
		},
		4: {
			total: 0,
			count: 0,
		},
		5: {
			total: 0,
			count: 0,
		},
		6: {
			total: 0,
			count: 0,
		},
		7: {
			total: 0,
			count: 0,
		},
	};

	// Get weekday from date and calculate average wait times
	data.forEach((record) => {
		const dayOfWeek = DateTime.fromISO(record.date).weekday;
		waitTimesAvg[dayOfWeek].count += 1;
		waitTimesAvg[dayOfWeek].total += record.avg_wait_time_minutes || 0;
	});

	console.log("Total wait times:", waitTimesAvg);

	const averageWaitTimes = Object.values(waitTimesAvg).map((day) => {
		return day.count > 0 ? parseFloat((day.total / day.count).toFixed(2)) : 0;
	});

	console.log("Average wait times:", averageWaitTimes);

	console.log("Returning average wait times:", averageWaitTimes);
	return { weeklyAverageWaitTimes: averageWaitTimes };
}

// Get average weekday wait times of a given year
export async function getWeekdayAverageWaitTimesByYear(rideId: string, year: number): Promise<{ weeklyAverageWaitTimes: number[] }> {
	// Fetch daily wait times for the specified year yyyy-mm-dd
	const { data, error } = await supabase.from("daily_ride_statistics").select("date, avg_wait_time_minutes").eq("ride_id", rideId).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);

	if (error) {
		console.error("Error fetching weekday average wait times by year:", error);
		return { weeklyAverageWaitTimes: [] };
	}

	// Process the data to get average wait times for each weekday
	const waitTimesByWeekday: { [key: number]: { total: number; count: number } } = {
		1: { total: 0, count: 0 },
		2: { total: 0, count: 0 },
		3: { total: 0, count: 0 },
		4: { total: 0, count: 0 },
		5: { total: 0, count: 0 },
		6: { total: 0, count: 0 },
		7: { total: 0, count: 0 },
	};

	data.forEach((record) => {
		const dayOfWeek = DateTime.fromISO(record.date).weekday;
		waitTimesByWeekday[dayOfWeek].total += record.avg_wait_time_minutes || 0;
		waitTimesByWeekday[dayOfWeek].count += 1;
	});

	const weeklyAverageWaitTimes = Object.values(waitTimesByWeekday).map((day) => {
		return day.count > 0 ? parseFloat((day.total / day.count).toFixed(2)) : 0;
	});

	return { weeklyAverageWaitTimes };
}

export default {
	getLiveRideStatisticsWithTimezone,
	getWeekdayAverageWaitTimes,
	getWeekdayAverageWaitTimesByYear,
};
