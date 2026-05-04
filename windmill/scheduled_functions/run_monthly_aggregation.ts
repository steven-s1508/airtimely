// Windmill Script: Monthly Aggregation
// Language: TypeScript (Deno)
// Description: Aggregate daily ride statistics into monthly statistics

import * as wmill from "npm:windmill-client@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function main(
    year?: number,
    month?: number
) {
    // Get environment variables (Windmill provides these)
    const supabaseUrl = (await wmill.getVariable('u/steven_s1508/SUPABASE_URL'));
    const supabaseServiceKey = (await wmill.getVariable('u/steven_s1508/SERVICE_ROLE_KEY'));
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing required environment variables: SUPABASE_URL and SERVICE_ROLE_KEY");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Default to current year and month if not provided
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    // Validate parameters
    if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
        throw new Error("Invalid year or month parameters");
    }
    
    console.log(`Starting monthly aggregation for ${targetYear}-${targetMonth}`);
    
    // Get all active rides
    const { data: rides, error: ridesError } = await supabase
        .from("rides")
        .select("id, name")
        .eq("is_active", true);
    
    if (ridesError) {
        throw new Error(`Error fetching rides: ${ridesError.message}`);
    }
    
    // Check for empty rides array
    if (!rides || rides.length === 0) {
        return {
            success: true,
            year: targetYear,
            month: targetMonth,
            totalRides: 0,
            successCount: 0,
            errorCount: 0,
            message: `No active rides found for monthly aggregation ${targetYear}-${targetMonth}`,
        };
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each ride
    for (const ride of rides) {
        try {
            // Call the PostgreSQL aggregation function
            const { error } = await supabase.rpc("aggregate_monthly_ride_stats", {
                p_ride_id: ride.id,
                p_year: targetYear,
                p_month: targetMonth,
            });
            
            if (error) {
                console.error(`Error aggregating monthly stats for ${ride.name}:`, error);
                errorCount++;
            } else {
                console.log(`✅ Aggregated monthly stats for ${ride.name}`);
                successCount++;
            }
        } catch (error) {
            console.error(`Exception processing monthly stats for ${ride.name}:`, error);
            errorCount++;
        }
    }
    
    return {
        success: true,
        year: targetYear,
        month: targetMonth,
        totalRides: rides.length,
        successCount,
        errorCount,
        message: `Monthly aggregation completed for ${targetYear}-${targetMonth}`,
    };
}