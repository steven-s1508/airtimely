import { DateTime } from "luxon";

/**
 * Normalizes a wait time record by rounding the recorded_at_local time to the nearest 5 minutes.
 * This is useful for ensuring consistent time intervals in wait time data.
 * @param record The wait time record to normalize.
 * @returns A new record with the recorded_at_local time rounded to the nearest 5 minutes
 * or null if the input record is invalid.
 */

export function normalizeWaitTimeRecord(record: { recorded_at_local: string }): {
	recorded_at_local: string;
} | null {
	if (!record) return null;
	const dateTime = DateTime.fromISO(record.recorded_at_local).setZone("local");
	if (!dateTime.isValid) return null;

	const minutes = dateTime.minute;

	// Round to nearest 5 minutes
	const roundedMinutes = Math.round(minutes / 5) * 5;

	if (roundedMinutes === 60) {
		// If rounding results in 60 minutes, increment the hour and reset minutes to 0
		return {
			recorded_at_local: dateTime.plus({ hour: 1 }).set({ minute: 0, second: 0, millisecond: 0 }).toFormat("HH:mm"),
		};
	}

	const normalizedDateTime = dateTime.set({ minute: roundedMinutes, second: 0, millisecond: 0 });

	return {
		recorded_at_local: normalizedDateTime.toFormat("HH:mm").toString(),
	};
}
