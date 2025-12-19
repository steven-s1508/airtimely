/**
 * Validates if a string is a valid UUID v4 format
 * @param str - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(str: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(str);
}
