/**
 * Mapping of ISO country codes to an array of searchable country names and aliases.
 * The first item in the array is considered the primary display name.
 */
export const countryAliases: Record<string, string[]> = {
	AU: ["Australia", "Aussie"],
	CN: ["China", "中华人民共和国", "中国"],
	FR: ["France", "Français"],
	JP: ["Japan", "日本", "日本国", "日本國"],
	DE: ["Germany", "Deutschland"],
	DK: ["Denmark", "Danmark"],
	IT: ["Italy", "Italia"],
	ES: ["Spain", "España"],
	US: ["United States", "USA", "America"],
	GB: ["UK", "United Kingdom", "Great Britain"],
	BE: ["Belgium", "België", "Belgique"],
	CA: ["Canada", "Canadá", "Kanada"],
	NL: ["Netherlands", "Holland", "Nederland"],
	KR: ["South Korea", "Korea", "한국"],
	SE: ["Sweden", "Sverige"],
	MX: ["Mexico", "México", "Meksiko"],
};

/**
 * Returns the primary country name for a given ISO country code.
 * @param code The ISO country code (e.g., "US", "DE").
 * @returns The primary country name, or the code itself if no mapping is found.
 */
export function getCountryName(code: string | null | undefined): string {
	if (!code) return "";
	const upperCode = code.toUpperCase();
	const aliases = countryAliases[upperCode];
	return aliases && aliases.length > 0 ? aliases[0] : upperCode;
}

/**
 * Returns all searchable aliases for a given ISO country code.
 * @param code The ISO country code (e.g., "US", "DE").
 * @returns An array of country names and aliases.
 */
export function getCountryAliases(code: string | null | undefined): string[] {
	if (!code) return [];
	const upperCode = code.toUpperCase();
	return countryAliases[upperCode] || [upperCode];
}
