/**
 * Mapping of ISO country codes to an array of searchable country names and aliases.
 * The first item in the array is considered the primary display name.
 */
export const countryAliases: Record<string, string[]> = {
	AE: ["United Arab Emirates", "UAE", "الإمارات"],
	AT: ["Austria", "Österreich"],
	AU: ["Australia", "Aussie"],
	BE: ["Belgium", "België", "Belgique"],
	BR: ["Brazil", "Brasil"],
	CA: ["Canada", "Canadá", "Kanada"],
	CN: ["China", "中华人民共和国", "中国"],
	DE: ["Germany", "Deutschland"],
	DK: ["Denmark", "Danmark"],
	ES: ["Spain", "España"],
	FI: ["Finland", "Suomi"],
	FR: ["France", "Français"],
	GB: ["UK", "United Kingdom", "Great Britain"],
	HK: ["Hong Kong", "香港"],
	ID: ["Indonesia"],
	IE: ["Ireland", "Éire"],
	IN: ["India", "भारत"],
	IT: ["Italy", "Italia"],
	JP: ["Japan", "日本", "日本国", "日本國"],
	KR: ["South Korea", "Korea", "한국"],
	MX: ["Mexico", "México", "Meksiko"],
	MY: ["Malaysia"],
	NL: ["Netherlands", "Holland", "Nederland"],
	NO: ["Norway", "Norge"],
	PL: ["Poland", "Polska"],
	PT: ["Portugal"],
	QA: ["Qatar", "قطر"],
	SA: ["Saudi Arabia", "Arabia Saudita", "السعودية"],
	SE: ["Sweden", "Sverige"],
	SG: ["Singapore", "新加坡"],
	TH: ["Thailand", "ประเทศไทย"],
	TR: ["Turkey", "Türkiye"],
	TW: ["Taiwan", "台灣"],
	US: ["United States", "USA", "America"],
	VN: ["Vietnam", "Việt Nam"],
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
