import { DateTime } from "luxon";

// Shared utility for formatting time strings in Airtimely

/**
 * Formats a time string (ISO or "HH:mm") to "HH:mm" 24-hour format.
 * Returns "N/A" if input is null, undefined, or invalid.
 * Uses Luxon for robust parsing and formatting.
 */
export function formatTime(time: string | null | undefined): string {
	if (!time) return "N/A";

	// Luxon can parse various ISO 8601 formats and "HH:mm" strings.
	// We assume the input time is in a format Luxon can understand or is already "HH:mm".
	// If it has timezone info, Luxon will parse it correctly.
	// If it's just "HH:mm", it will be treated as today in local system timezone.
	const dt = DateTime.fromISO(time, { setZone: true }); // setZone: true to preserve timezone info if present

	if (dt.isValid) {
		// Format to "HH:mm" in 24-hour format, ensuring two digits for hour and minute.
		return dt.toFormat("HH:mm");
	}

	// Fallback if Luxon parsing fails (e.g., very malformed string)
	// Try to extract HH:mm using regex as a last resort.
	const match = time.match(/T?(\d{2}):(\d{2})/);
	if (match) {
		return `${match[1]}:${match[2]}`;
	}

	// If all else fails
	return "N/A";
}
