/**
 * Alera Metrics Pipeline - Main Handler
 * 
 * Real-time metrics calculation triggered after habit logging.
 * Extracts user_id from JWT, calculates all metrics, and writes to database.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { RequestBody, Metric } from "./types.ts";
import { getUserIdFromToken, getTodayInCDMX } from "./utils.ts";
import { fetchRecordsForDate, writeMetrics } from "./database.ts";
import {
  calculateDailyTotal,
  calculateWeeklyAverage,
  calculateMonthlyAverage,
  calculateStreak,
} from "./calculator.ts";

serve(async (req) => {
  console.log("=== Real-time Metrics Calculation ===");

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { habit_id, logical_date } = body;

    if (!habit_id) {
      return new Response(
        JSON.stringify({ error: "habit_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user_id from JWT token
    const user_id = await getUserIdFromToken(req);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate habit ownership (security check)
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("id")
      .eq("id", habit_id)
      .eq("user_id", user_id)
      .single();

    if (habitError || !habit) {
      return new Response(
        JSON.stringify({ error: "Habit not found or access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use provided logical_date or default to today in CDMX
    const targetDate = logical_date || getTodayInCDMX();
    console.log(
      `Calculating metrics for user=${user_id}, habit=${habit_id}, date=${targetDate}`
    );

    // Fetch records for this specific date
    const records = await fetchRecordsForDate(
      supabase,
      user_id,
      habit_id,
      targetDate
    );

    console.log(`Found ${records.length} records for this date`);

    // Calculate all metrics (even if no records today - weekly/monthly use historical data)
    const metrics: Metric[] = [];

    // Daily total and streak only exist if there's data TODAY
    if (records.length > 0) {
      const dailyTotal = calculateDailyTotal(
        user_id,
        habit_id,
        records,
        targetDate
      );
      if (dailyTotal) metrics.push(dailyTotal);

      const streak = await calculateStreak(
        supabase,
        user_id,
        habit_id,
        targetDate
      );
      if (streak) metrics.push(streak);
    }

    // Weekly and monthly averages look at historical data
    // Calculate them even if no data today (they might still have values from other days)
    const weeklyAvg = await calculateWeeklyAverage(
      supabase,
      user_id,
      habit_id,
      targetDate
    );
    if (weeklyAvg) metrics.push(weeklyAvg);

    const monthlyAvg = await calculateMonthlyAverage(
      supabase,
      user_id,
      habit_id,
      targetDate
    );
    if (monthlyAvg) metrics.push(monthlyAvg);

    console.log(`Calculated ${metrics.length} metrics`);

    // If no metrics at all, delete all existing metrics for this habit
    if (metrics.length === 0) {
      console.log("No metrics calculated - deleting all existing metrics for this habit");
      
      const { error: deleteError } = await supabase
        .from("metrics")
        .delete()
        .eq("user_id", user_id)
        .eq("habit_id", habit_id);

      if (deleteError) {
        console.error("Error deleting metrics:", deleteError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          user_id,
          habit_id,
          logical_date: targetDate,
          records_found: 0,
          metrics_calculated: 0,
          metrics_written: 0,
          metrics_deleted: true,
          message: "No data - all metrics deleted",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Write metrics to database (UPSERT will update weekly/monthly)
    const written = await writeMetrics(supabase, metrics);

    // Success response
    const result = {
      success: true,
      user_id,
      habit_id,
      logical_date: targetDate,
      records_found: records.length,
      metrics_calculated: metrics.length,
      metrics_written: written,
      metrics: metrics.map((m) => ({ type: m.metric_type, value: m.value })),
    };

    console.log("=== Success ===", result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== Error ===", error);

    // Handle authentication errors specifically
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isAuthError =
      errorMessage.includes("auth token") ||
      errorMessage.includes("Invalid auth");

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: isAuthError ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
