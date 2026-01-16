import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main(
    date?: string, 
    hour?: number, 
    ride_id?: number, 
    mode: string = "single",
    manual_timezone?: string
) {
    // Get environment variables (Windmill provides these)
    const supabaseUrl = await wmill.getVariable("u/steven_s1508/SUPABASE_URL");
    const supabaseServiceKey = await wmill.getVariable("u/steven_s1508/SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get rides to process with their park timezone info
    let ridesQuery = supabase
        .from("rides")
        .select(
            `
            id, 
            name,
            parks!inner(
                id,
                name,
                timezone
            )
        `
        )
        .eq("is_active", true);

    if (ride_id) {
        ridesQuery = ridesQuery.eq("id", ride_id);
    }

    const { data: rides, error: ridesError } = await ridesQuery;
    if (ridesError) {
        throw new Error(`Error fetching rides: ${ridesError.message}`);
    }

    if (!rides || rides.length === 0) {
        return {
            success: true,
            date: date || "auto",
            hour: mode === "single" ? (hour !== undefined ? hour : "auto") : "all",
            mode: mode,
            totalRides: 0,
            successCount: 0,
            errorCount: 0,
            message: "No active rides found",
        };
    }

    let successCount = 0;
    let errorCount = 0;

    // Group rides by timezone to process them efficiently
    const ridesByTimezone = new Map<string, typeof rides>();

    for (const ride of rides) {
        const timezone = ride.parks?.timezone || "UTC";
        if (!ridesByTimezone.has(timezone)) {
            ridesByTimezone.set(timezone, []);
        }
        ridesByTimezone.get(timezone)!.push(ride);
    }

    // Helper function to convert time from one timezone to target timezone
    function convertTimeBetweenTimezones(
        date: string, 
        hour: number, 
        sourceTimezone: string, 
        targetTimezone: string
    ): { date: string; hour: number } {
        // Create date in source timezone
        const sourceDateTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`);
        
        // Convert to UTC first, then to target timezone
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: targetTimezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            hour12: false,
        });

        // Get the time in target timezone
        const parts = formatter.formatToParts(sourceDateTime);
        const targetYear = parseInt(parts.find((p) => p.type === "year")!.value);
        const targetMonth = parseInt(parts.find((p) => p.type === "month")!.value);
        const targetDay = parseInt(parts.find((p) => p.type === "day")!.value);
        const targetHour = parseInt(parts.find((p) => p.type === "hour")!.value);

        const targetDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`;
        
        return { date: targetDate, hour: targetHour };
    }

    // Process each timezone group
    for (const [timezone, timezoneRides] of ridesByTimezone) {
        try {
            let targetDate: string;
            let targetHour: number;

            if (date && hour !== undefined) {
                if (manual_timezone) {
                    // Manual run with timezone conversion
                    console.log(`Manual run: Converting ${date} ${hour}:00 from ${manual_timezone} to ${timezone}`);
                    
                    if (manual_timezone === timezone) {
                        // Same timezone, no conversion needed
                        targetDate = date;
                        targetHour = hour;
                    } else {
                        // Convert from manual_timezone to target timezone
                        const converted = convertTimeBetweenTimezones(date, hour, manual_timezone, timezone);
                        targetDate = converted.date;
                        targetHour = converted.hour;
                    }
                    
                    console.log(`Converted to: ${targetDate} ${targetHour}:00 in ${timezone}`);
                } else {
                    // Manual run without timezone (use provided date/hour as-is)
                    targetDate = date;
                    targetHour = hour;
                }
            } else {
                // Automatic run (cron job) - calculate previous hour in park's timezone
                const now = new Date();

                // Create a formatter for the target timezone
                const formatter = new Intl.DateTimeFormat("en-CA", {
                    timeZone: timezone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    hour12: false,
                });

                // Get current time in the park's timezone
                const parts = formatter.formatToParts(now);
                const localYear = parseInt(parts.find((p) => p.type === "year")!.value);
                const localMonth = parseInt(parts.find((p) => p.type === "month")!.value);
                const localDay = parseInt(parts.find((p) => p.type === "day")!.value);
                const localHour = parseInt(parts.find((p) => p.type === "hour")!.value);

                // Calculate previous hour in local timezone
                const currentLocalTime = new Date(localYear, localMonth - 1, localDay, localHour, 0, 0);
                const previousLocalHour = new Date(currentLocalTime.getTime() - 60 * 60 * 1000);

                targetDate = previousLocalHour.toISOString().split("T")[0];
                targetHour = previousLocalHour.getHours();
            }

            console.log(`Processing timezone ${timezone}: ${targetDate} hour ${targetHour} (${timezoneRides.length} rides)`);

            // Process each ride in this timezone
            for (const ride of timezoneRides) {
                try {
                    if (mode === "single") {
                        // Process only the specified hour (default for cron jobs)
                        const { error } = await supabase.rpc("aggregate_hourly_ride_stats", {
                            p_ride_id: ride.id,
                            p_date: targetDate,
                            p_hour: targetHour,
                        });

                        if (error) {
                            console.error(`Error aggregating hour ${targetHour} for ${ride.name} (${timezone}):`, error);
                            errorCount++;
                        } else {
                            console.log(`✅ Aggregated hour ${targetHour} for ${ride.name} (${timezone})`);
                            successCount++;
                        }
                    } else {
                        // Process all 24 hours (for manual runs or catch-up)
                        const { error } = await supabase.rpc("aggregate_all_hourly_stats_for_date", {
                            p_ride_id: ride.id,
                            p_date: targetDate,
                        });

                        if (error) {
                            console.error(`Error aggregating all hours for ${ride.name} (${timezone}):`, error);
                            errorCount++;
                        } else {
                            console.log(`✅ Aggregated all hours for ${ride.name} (${timezone})`);
                            successCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Exception processing ${ride.name} (${timezone}):`, error);
                    errorCount++;
                }
            }
        } catch (error) {
            console.error(`Error processing timezone ${timezone}:`, error);
            // Count all rides in this timezone as errors
            errorCount += timezoneRides.length;
        }
    }

    return {
        success: true,
        timezones: Array.from(ridesByTimezone.keys()),
        mode: mode,
        manual_timezone: manual_timezone || "none",
        totalRides: rides.length,
        successCount,
        errorCount,
        message: `Aggregation completed for ${ridesByTimezone.size} timezone(s)`,
    };
}