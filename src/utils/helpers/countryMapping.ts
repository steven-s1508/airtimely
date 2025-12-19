/**
 * Mapping of ISO country codes to full country names.
 * This is used to enhance the search functionality, allowing users to search by country name.
 */
export const countryCodeToName: Record<string, string> = {
	CN: "China",
	FR: "France",
	JP: "Japan",
	DE: "Germany",
	DK: "Denmark",
	IT: "Italy",
	ES: "Spain",
	US: "United States",
	GB: "UK",
	BE: "Belgium",
	CA: "Canada",
	NL: "Netherlands",
	KR: "South Korea",
	SE: "Sweden",
	MX: "Mexico",
};

/**
 * Returns the full country name for a given ISO country code.
 * @param code The ISO country code (e.g., "US", "DE").
 * @returns The full country name, or the code itself if no mapping is found.
 */
export function getCountryName(code: string | null | undefined): string {
	if (!code) return "";
	const upperCode = code.toUpperCase();
	return countryCodeToName[upperCode] || upperCode;
}
