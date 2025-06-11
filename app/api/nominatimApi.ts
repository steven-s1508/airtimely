import { NominatimResponse } from "@/src/types/nominatimApi"; // Corrected path

// --- Geocoding using Nominatim ---

// Function to fetch the full Nominatim data for given coordinates
export async function fetchNominatimData(latitude?: number, longitude?: number): Promise<NominatimResponse | null> {
	if (typeof latitude !== "number" || typeof longitude !== "number") {
		console.warn("Latitude or longitude is not a number, skipping geocoding.");
		return null;
	}

	const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;

	try {
		console.log(`Fetching Nominatim data for: ${latitude}, ${longitude} using URL: ${nominatimUrl}`);
		const response = await fetch(nominatimUrl, {
			headers: {
				"User-Agent": "AirTimelyApp/1.0 (github.com/steven_s1508/airtimely)", // IMPORTANT: Set a valid User-Agent
			},
		});

		// Respect Nominatim's usage policy: max 1 request per second.
		await new Promise((resolve) => setTimeout(resolve, 1100));

		if (!response.ok) {
			console.error(`Nominatim API error for ${latitude}, ${longitude}: ${response.status} ${response.statusText}`);
			const errorBody = await response.text();
			console.error("Nominatim error body:", errorBody);
			return null;
		}

		const data: NominatimResponse = await response.json();

		if (data) {
			// Check if data itself is not null/undefined
			console.log(`Nominatim data received for ${latitude}, ${longitude}.`);
			return data; // Return the full Nominatim response object
		} else {
			console.warn(`No data in Nominatim response for ${latitude}, ${longitude}.`);
			return null;
		}
	} catch (error) {
		console.error(`Error during Nominatim HTTP request for ${latitude}, ${longitude}:`, error);
		// Also add a delay here in case of network errors before retrying or moving on
		await new Promise((resolve) => setTimeout(resolve, 1100));
		return null;
	}
}

// Existing function - you might choose to keep it, remove it, or have it call fetchNominatimData
export default async function getCountryCodeFromCoordinates(latitude?: number, longitude?: number): Promise<string | null> {
	const nominatimData = await fetchNominatimData(latitude, longitude);
	if (nominatimData && nominatimData.address && nominatimData.address.country_code) {
		console.log(`Country code found via getCountryCodeFromCoordinates: ${nominatimData.address.country_code.toUpperCase()}`);
		return nominatimData.address.country_code.toUpperCase();
	} else {
		console.warn(`Country code not found in Nominatim response (called from getCountryCodeFromCoordinates) for ${latitude}, ${longitude}.`);
		return null;
	}
}
