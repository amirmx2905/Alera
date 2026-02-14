/**
 * Alera Metrics Pipeline - Main Handler
 *
 * Real-time metrics calculation triggered after habit logging.
 * Extracts auth user from JWT, calculates all metrics, and writes to database.
 */

import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import type { RequestBody, Metric } from "./types.ts";
import { getUserIdFromToken, getTodayInCDMX } from "./utils.ts";
import { fetchRecordsForDate, writeMetrics } from "./database.ts";
import {
  calculateDailyTotal,
  calculateWeeklyAverage,
  calculateMonthlyAverage,
  calculateStreak,
  calculateBestStreak,
  calculateActiveDays,
  calculateTotalEntriesDaily,
  calculateTotalEntriesWeekly,
  calculateTotalEntriesMonthly,
  calculateDaysCompleted30d,
  calculateAverageValue30d,
  calculateTotalEntriesAllTime,
  calculateTodayGoalsProgress,
} from "./calculator.ts";

serve(async (req) => {
  console.log("=== Real-time Metrics Calculation ===");

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { habit_id, profile_id, logical_date } = body;

    if (!habit_id || !profile_id) {
      return new Response(
        JSON.stringify({ error: "habit_id and profile_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Get auth user id from JWT token
    const auth_user_id = await getUserIdFromToken(req);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Validate profile ownership (security check)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profile_id)
      .eq("auth_user_id", auth_user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found or access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Validate habit ownership (security check)
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("id")
      .eq("id", habit_id)
      .eq("profile_id", profile_id)
      .single();

    if (habitError || !habit) {
      return new Response(
        JSON.stringify({ error: "Habit not found or access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Use provided logical_date or default to today in CDMX
    const targetDate = logical_date || getTodayInCDMX();
    console.log(
      `Calculating metrics for profile=${profile_id}, habit=${habit_id}, date=${targetDate}`,
    );

    // Fetch records for this specific date
    const records = await fetchRecordsForDate(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );

    console.log(`Found ${records.length} records for this date`);

    // Calculate all metrics (even if no records today - weekly/monthly use historical data)
    const habitMetrics: Metric[] = [];
    const profileMetrics: Metric[] = [];

    // Daily total and streak only exist if there's data TODAY
    if (records.length > 0) {
      const dailyTotal = calculateDailyTotal(
        profile_id,
        habit_id,
        records,
        targetDate,
      );
      if (dailyTotal) habitMetrics.push(dailyTotal);

      const streak = await calculateStreak(
        supabase,
        profile_id,
        habit_id,
        targetDate,
      );
      if (streak) habitMetrics.push(streak);
    }

    // Weekly and monthly averages look at historical data
    // Calculate them even if no data today (they might still have values from other days)
    const weeklyAvg = await calculateWeeklyAverage(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );
    if (weeklyAvg) habitMetrics.push(weeklyAvg);

    const monthlyAvg = await calculateMonthlyAverage(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );
    if (monthlyAvg) habitMetrics.push(monthlyAvg);

    const bestStreak = await calculateBestStreak(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );
    if (bestStreak) habitMetrics.push(bestStreak);

    const daysCompleted = await calculateDaysCompleted30d(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );
    habitMetrics.push(daysCompleted);

    const avgValue = await calculateAverageValue30d(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );
    if (avgValue) habitMetrics.push(avgValue);

    const totalAllTime = await calculateTotalEntriesAllTime(
      supabase,
      profile_id,
      habit_id,
      targetDate,
    );
    if (totalAllTime) habitMetrics.push(totalAllTime);

    const { data: activeHabits, error: activeHabitsError } = await supabase
      .from("habits")
      .select("id")
      .eq("profile_id", profile_id)
      .eq("status", "active");

    if (activeHabitsError) {
      throw activeHabitsError;
    }

    const activeHabitIds = (activeHabits || []).map((h) => h.id);

    if (activeHabitIds.length > 0) {
      const { data: bestStreakMetric, error: bestStreakError } = await supabase
        .from("metrics")
        .select("value")
        .eq("profile_id", profile_id)
        .eq("metric_type", "best_streak")
        .in("habit_id", activeHabitIds)
        .order("value", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bestStreakError) {
        throw bestStreakError;
      }

      const bestStreakValue = Math.max(
        Number(bestStreak?.value ?? 0),
        Number(bestStreakMetric?.value ?? 0),
      );

      if (bestStreakValue > 0) {
        profileMetrics.push({
          profile_id,
          habit_id: null,
          date: targetDate,
          metric_type: "best_streak_overall",
          granularity: "all_time",
          value: bestStreakValue,
          metadata: {
            source: "max_per_habit",
            habit_count: activeHabitIds.length,
          },
        });
      }
    }

    profileMetrics.push(
      await calculateTotalEntriesDaily(
        supabase,
        profile_id,
        activeHabitIds,
        targetDate,
      ),
    );

    profileMetrics.push(
      await calculateTotalEntriesWeekly(
        supabase,
        profile_id,
        activeHabitIds,
        targetDate,
      ),
    );

    profileMetrics.push(
      await calculateTotalEntriesMonthly(
        supabase,
        profile_id,
        activeHabitIds,
        targetDate,
      ),
    );

    profileMetrics.push(
      ...(await calculateTodayGoalsProgress(
        supabase,
        profile_id,
        activeHabitIds,
        targetDate,
      )),
    );

    const activeDays = await calculateActiveDays(
      supabase,
      profile_id,
      targetDate,
    );
    profileMetrics.push(activeDays);

    const metrics: Metric[] = [...habitMetrics, ...profileMetrics];

    console.log(`Calculated ${metrics.length} metrics`);

    // If no habit metrics at all, delete all existing metrics for this habit
    let habitMetricsDeleted = false;

    if (habitMetrics.length === 0) {
      console.log(
        "No metrics calculated - deleting all existing metrics for this habit",
      );

      const { error: deleteError } = await supabase
        .from("metrics")
        .delete()
        .eq("profile_id", profile_id)
        .eq("habit_id", habit_id);

      if (deleteError) {
        console.error("Error deleting metrics:", deleteError);
      } else {
        habitMetricsDeleted = true;
      }
    }

    // Write metrics to database (UPSERT will update weekly/monthly)
    const written = await writeMetrics(supabase, metrics);

    // Success response
    const result = {
      success: true,
      profile_id,
      habit_id,
      logical_date: targetDate,
      records_found: records.length,
      metrics_calculated: metrics.length,
      metrics_written: written,
      metrics_deleted: habitMetricsDeleted,
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
      },
    );
  }
});
