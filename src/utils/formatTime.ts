// Shared utility for formatting time strings in Airtimely

/**
 * Formats a time string (ISO or "HH:mm") to "HH:mm" 24-hour format.
 * Returns "N/A" if input is null, undefined, or invalid.
 */
export function formatTime(time: string | null | undefined): string {
	if (!time) return "N/A";
	// Try to extract HH:mm from ISO or direct string
	const match = time.match(/T?(\d{2}):(\d{2})/);
	if (match) {
		return `${match[1]}:${match[2]}`;
	}
	// Fallback: try to parse as Date
	const date = new Date(time);
	if (!isNaN(date.getTime())) {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	}
	return "N/A";
}
