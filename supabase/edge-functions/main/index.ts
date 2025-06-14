import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
	const url = new URL(req.url);
	const pathParts = url.pathname.split("/").filter(Boolean);

	// For paths like /main/function-name, get the function name
	const functionName = pathParts[pathParts.length - 1];

	console.log(`Received request for function: ${functionName}`);
	console.log(`Full path: ${url.pathname}`);
	console.log(`Path parts:`, pathParts);

	try {
		switch (functionName) {
			case "run-daily-aggregation":
				const { default: dailyAgg } = await import("../run-daily-aggregation/index.ts");
				return await dailyAgg(req);

			case "run-hourly-aggregation":
				const { default: hourlyAgg } = await import("../run-hourly-aggregation/index.ts");
				return await hourlyAgg(req);

			case "run-monthly-aggregation":
				const { default: monthlyAgg } = await import("../run-monthly-aggregation/index.ts");
				return await monthlyAgg(req);

			case "update-live-data-02":
				const { default: updateLive } = await import("../update-live-data-02/index.ts");
				return await updateLive(req);

			case "update-park-operating-hours":
				const { default: updatePark } = await import("../update-park-operating-hours/index.ts");
				return await updatePark(req);

			case "main":
			case "":
				return new Response(`Available functions: run-daily-aggregation, run-hourly-aggregation, run-monthly-aggregation, update-live-data-02, update-park-operating-hours`, {
					status: 200,
					headers: { "Content-Type": "text/plain" },
				});

			default:
				return new Response(`Function '${functionName}' not found. Available functions: run-daily-aggregation, run-hourly-aggregation, run-monthly-aggregation, update-live-data-02, update-park-operating-hours`, {
					status: 404,
					headers: { "Content-Type": "text/plain" },
				});
		}
	} catch (error) {
		console.error(`Error executing function ${functionName}:`, error);
		return new Response(`Error: ${error.message}`, {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});
	}
});
