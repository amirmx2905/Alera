/**
 * Alera Metrics Pipeline - Main Handler
 *
 * Real-time metrics calculation triggered after habit logging.
 * Extracts auth user from JWT, calculates all metrics, and writes to database.
 */

import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import type { HabitLogRecord, RequestBody, Metric } from "./types.ts";
import { getUserIdFromToken, getTodayInCDMX } from "./utils.ts";
import {
  fetchRecordsForDate,
  fetchHabitAllTimeData,
  writeMetrics,
} from "./database.ts";
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

type JsonResponseInit = {
  status?: number;
};

const jsonResponse = (payload: unknown, init: JsonResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });

const createSupabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

async function ensureProfileAccess(
  supabase: ReturnType<typeof createSupabaseClient>,
  authUserId: string,
  profileId: string,
) {
  const { data: ownedProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (ownedProfile) return;

  const { data: supervisorProfiles, error: supervisorError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId);

  if (supervisorError) {
    throw supervisorError;
  }

  const supervisorIds = (supervisorProfiles || []).map((row) => row.id);
  if (supervisorIds.length === 0) {
    throw new Error("Profile not found or access denied");
  }

  const { data: supervision, error: supervisionError } = await supabase
    .from("user_supervision")
    .select("id")
    .eq("monitored_profile_id", profileId)
    .in("supervisor_profile_id", supervisorIds)
    .maybeSingle();

  if (supervisionError) {
    throw supervisionError;
  }

  if (!supervision) {
    throw new Error("Profile not found or access denied");
  }
}

async function ensureHabitAccess(
  supabase: ReturnType<typeof createSupabaseClient>,
  profileId: string,
  habitId: string,
) {
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("profile_id", profileId)
    .single();

  if (habitError || !habit) {
    throw new Error("Habit not found or access denied");
  }
}

async function calculateHabitMetrics(
  supabase: ReturnType<typeof createSupabaseClient>,
  profileId: string,
  habitId: string,
  targetDate: string,
  records: HabitLogRecord[],
) {
  const habitMetrics: Metric[] = [];

  const allTimeRecords = await fetchHabitAllTimeData(
    supabase,
    profileId,
    habitId,
  );

  if (allTimeRecords.length === 0) {
    return {
      habitMetrics: [],
      bestStreak: null,
      shouldDeleteHabitMetrics: true,
    };
  }

  if (records.length > 0) {
    const dailyTotal = calculateDailyTotal(
      profileId,
      habitId,
      records,
      targetDate,
    );
    if (dailyTotal) habitMetrics.push(dailyTotal);

    const streak = await calculateStreak(
      supabase,
      profileId,
      habitId,
      targetDate,
    );
    if (streak) habitMetrics.push(streak);
  }

  const weeklyAvg = await calculateWeeklyAverage(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (weeklyAvg) habitMetrics.push(weeklyAvg);

  const monthlyAvg = await calculateMonthlyAverage(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (monthlyAvg) habitMetrics.push(monthlyAvg);

  const bestStreak = await calculateBestStreak(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (bestStreak) habitMetrics.push(bestStreak);

  const daysCompleted = await calculateDaysCompleted30d(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  habitMetrics.push(daysCompleted);

  const avgValue = await calculateAverageValue30d(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (avgValue) habitMetrics.push(avgValue);

  const totalAllTime = await calculateTotalEntriesAllTime(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (totalAllTime) habitMetrics.push(totalAllTime);

  return { habitMetrics, bestStreak, shouldDeleteHabitMetrics: false };
}

async function deleteBestStreakOverall(
  supabase: ReturnType<typeof createSupabaseClient>,
  profileId: string,
) {
  const { error } = await supabase
    .from("metrics")
    .delete()
    .eq("profile_id", profileId)
    .is("habit_id", null)
    .eq("metric_type", "best_streak_overall");

  if (error) {
    console.error("Error deleting best_streak_overall:", error);
  }
}

async function calculateProfileMetrics(
  supabase: ReturnType<typeof createSupabaseClient>,
  profileId: string,
  targetDate: string,
  activeHabitIds: string[],
  habitIdsWithLogs: string[],
  bestStreak: Metric | null,
) {
  const profileMetrics: Metric[] = [];

  if (habitIdsWithLogs.length > 0) {
    const { data: bestStreakMetric, error: bestStreakError } = await supabase
      .from("metrics")
      .select("value, habit_id")
      .eq("profile_id", profileId)
      .eq("metric_type", "best_streak")
      .in("habit_id", habitIdsWithLogs)
      .order("value", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bestStreakError) {
      throw bestStreakError;
    }

    const bestStreakMetricValue = Number(bestStreakMetric?.value ?? 0);
    const bestStreakValue = Math.max(
      Number(bestStreak?.value ?? 0),
      bestStreakMetricValue,
    );
    const bestHabitId =
      bestStreak && Number(bestStreak.value) > bestStreakMetricValue
        ? bestStreak.habit_id
        : (bestStreakMetric?.habit_id ?? bestStreak?.habit_id ?? null);

    if (bestStreakValue > 0) {
      profileMetrics.push({
        profile_id: profileId,
        habit_id: null,
        date: targetDate,
        metric_type: "best_streak_overall",
        granularity: "all_time",
        value: bestStreakValue,
        metadata: {
          source: "max_per_habit",
          habit_count: habitIdsWithLogs.length,
          best_habit_id: bestHabitId,
        },
      });
    } else {
      await deleteBestStreakOverall(supabase, profileId);
    }
  } else {
    await deleteBestStreakOverall(supabase, profileId);
  }

  profileMetrics.push(
    await calculateTotalEntriesDaily(
      supabase,
      profileId,
      activeHabitIds,
      targetDate,
    ),
  );

  profileMetrics.push(
    await calculateTotalEntriesWeekly(
      supabase,
      profileId,
      activeHabitIds,
      targetDate,
    ),
  );

  profileMetrics.push(
    await calculateTotalEntriesMonthly(
      supabase,
      profileId,
      activeHabitIds,
      targetDate,
    ),
  );

  profileMetrics.push(
    ...(await calculateTodayGoalsProgress(
      supabase,
      profileId,
      activeHabitIds,
      targetDate,
    )),
  );

  const activeDays = await calculateActiveDays(supabase, profileId, targetDate);
  profileMetrics.push(activeDays);

  return profileMetrics;
}

serve(async (req) => {
  console.log("=== Real-time Metrics Calculation ===");

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { habit_id, profile_id, logical_date } = body;
    const isProfileOnly = !habit_id;

    if (!profile_id) {
      return jsonResponse({ error: "profile_id is required" }, { status: 400 });
    }

    // Get auth user id from JWT token
    const auth_user_id = await getUserIdFromToken(req);

    // Initialize Supabase client with service role
    const supabase = createSupabaseClient();

    try {
      await ensureProfileAccess(supabase, auth_user_id, profile_id);
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Access denied" },
        { status: 403 },
      );
    }

    if (!isProfileOnly) {
      try {
        await ensureHabitAccess(supabase, profile_id, habit_id);
      } catch (error) {
        return jsonResponse(
          { error: error instanceof Error ? error.message : "Access denied" },
          { status: 403 },
        );
      }
    }

    // Use provided logical_date or default to today in CDMX
    const targetDate = logical_date || getTodayInCDMX();
    console.log(
      `Calculating metrics for profile=${profile_id}, habit=${habit_id}, date=${targetDate}`,
    );

    // Fetch records for this specific date
    const records = isProfileOnly
      ? []
      : await fetchRecordsForDate(supabase, profile_id, habit_id, targetDate);

    console.log(`Found ${records.length} records for this date`);

    // Calculate all metrics (even if no records today - weekly/monthly use historical data)
    let habitMetrics: Metric[] = [];
    let bestStreak: Metric | null = null;
    let shouldDeleteHabitMetrics = false;

    if (!isProfileOnly) {
      const result = await calculateHabitMetrics(
        supabase,
        profile_id,
        habit_id,
        targetDate,
        records,
      );
      habitMetrics = result.habitMetrics;
      bestStreak = result.bestStreak;
      shouldDeleteHabitMetrics = result.shouldDeleteHabitMetrics;
    }

    const { data: activeHabits, error: activeHabitsError } = await supabase
      .from("habits")
      .select("id")
      .eq("profile_id", profile_id)
      .eq("status", "active");

    if (activeHabitsError) {
      throw activeHabitsError;
    }

    const activeHabitIds = (activeHabits || []).map((h) => h.id);

    let habitIdsWithLogs: string[] = [];
    if (activeHabitIds.length > 0) {
      const { data: habitLogIds, error: habitLogError } = await supabase
        .from("habits_log")
        .select("habit_id")
        .eq("profile_id", profile_id)
        .in("habit_id", activeHabitIds);

      if (habitLogError) {
        throw habitLogError;
      }

      habitIdsWithLogs = Array.from(
        new Set((habitLogIds || []).map((row) => row.habit_id as string)),
      );
    }

    const profileMetrics = await calculateProfileMetrics(
      supabase,
      profile_id,
      targetDate,
      activeHabitIds,
      habitIdsWithLogs,
      bestStreak,
    );

    const metrics: Metric[] = [...habitMetrics, ...profileMetrics];

    console.log(`Calculated ${metrics.length} metrics`);

    // If no habit metrics at all, delete all existing metrics for this habit
    let habitMetricsDeleted = false;

    if (
      !isProfileOnly &&
      (habitMetrics.length === 0 || shouldDeleteHabitMetrics)
    ) {
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
      habit_id: habit_id ?? null,
      logical_date: targetDate,
      records_found: records.length,
      metrics_calculated: metrics.length,
      metrics_written: written,
      metrics_deleted: habitMetricsDeleted,
      metrics: metrics.map((m) => ({ type: m.metric_type, value: m.value })),
    };

    console.log("=== Success ===", result);

    return jsonResponse(result);
  } catch (error) {
    console.error("=== Error ===", error);

    // Handle authentication errors specifically
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isAuthError =
      errorMessage.includes("auth token") ||
      errorMessage.includes("Invalid auth");

    return jsonResponse(
      {
        success: false,
        error: errorMessage,
      },
      { status: isAuthError ? 401 : 500 },
    );
  }
});
