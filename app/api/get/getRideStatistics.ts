import { supabase } from "@/src/utils/supabase";

// Get available months for a ride
export async function getAvailableMonthsForRide(rideId: string) {
	const { data, error } = await supabase.from("monthly_ride_statistics").select("year, month").eq("ride_id", rideId).order("year", { ascending: false }).order("month", { ascending: false });

	return { data, error };
}

// Get monthly statistics for a specific ride and month
export async function getMonthlyRideStatistics(rideId: string, year: number, month: number) {
	const { data, error } = await supabase.from("monthly_ride_statistics").select("*").eq("ride_id", rideId).eq("year", year).eq("month", month).single();

	return { data, error };
}

// Get daily breakdown for a specific month
export async function getDailyRideStatistics(rideId: string, year: number, month: number) {
	const startDate = new Date(year, month - 1, 1);
	const endDate = new Date(year, month, 0);

	const { data, error } = await supabase.from("daily_ride_statistics").select("*").eq("ride_id", rideId).gte("date", startDate.toISOString().split("T")[0]).lte("date", endDate.toISOString().split("T")[0]).order("date");

	return { data, error };
}

export default {
	getAvailableMonthsForRide,
	getMonthlyRideStatistics,
	getDailyRideStatistics,
};
