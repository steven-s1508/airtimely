import { NominatimResponse } from "../types/nominatomApi";

// --- Geocoding using Nominatim ---
export async function getCountryCodeFromCoordinates(latitude?: number, longitude?: number): Promise<string | null> {
	if (typeof latitude !== "number" || typeof longitude !== "number") {
		console.warn("Latitude or longitude is not a number, skipping geocoding.");
		return null;
	}

	const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;

	try {
		console.log(`Reverse geocoding for: ${latitude}, ${longitude} using URL: ${nominatimUrl}`);
		const response = await fetch(nominatimUrl, {
			headers: {
				"User-Agent": "AirTimelyApp/1.0 (github.com/steven_s1508/airtimely)", // IMPORTANT: Set a valid User-Agent
			},
		});

		// Respect Nominatim's usage policy: max 1 request per second.
		// This delay is placed *after* the request to ensure the rate limit is met.
		await new Promise((resolve) => setTimeout(resolve, 1100));

		if (!response.ok) {
			console.error(`Nominatim API error for ${latitude}, ${longitude}: ${response.status} ${response.statusText}`);
			const errorBody = await response.text();
			console.error("Nominatim error body:", errorBody);
			return null;
		}

		const data: NominatimResponse = await response.json();

		if (data && data.address && data.address.country_code) {
			console.log(`Country code found: ${data.address.country_code.toUpperCase()}`);
			return data.address.country_code.toUpperCase();
		} else {
			console.warn(`Country code not found in Nominatim response for ${latitude}, ${longitude}. Response:`, data);
			return null;
		}
	} catch (error) {
		console.error(`Error during reverse geocoding HTTP request for ${latitude}, ${longitude}:`, error);
		// Also add a delay here in case of network errors before retrying or moving on
		await new Promise((resolve) => setTimeout(resolve, 1100));
		return null;
	}
}
