// Helper functions for working with hourly JSONB data
export function parseHourlyData(hourlyData: Json): HourlyDataPoint[] {
	return Array.isArray(hourlyData) ? (hourlyData as HourlyDataPoint[]) : [];
}

export function getHourlyWaitTime(hourlyData: Json, hour: number): number | null {
	const data = parseHourlyData(hourlyData);
	const hourData = data.find((h) => h.h === hour);
	return hourData?.avg || null;
}

export function getPeakHours(hourlyData: Json, count = 3): HourlyDataPoint[] {
	const data = parseHourlyData(hourlyData);
	return data
		.filter((h) => h.avg !== undefined)
		.sort((a, b) => (b.avg || 0) - (a.avg || 0))
		.slice(0, count);
}

export function getOperatingHours(hourlyData: Json): HourlyDataPoint[] {
	const data = parseHourlyData(hourlyData);
	return data.filter((h) => h.op && h.op > 0);
}
