import { supabase } from "@/src/utils/supabase";

export default async function getDestinations() {
	const { data, error } = await supabase.from("destinations").select("*");
	if (error) {
		console.error("Error fetching destinations:", error);
		return [];
	}
	return data;
}
