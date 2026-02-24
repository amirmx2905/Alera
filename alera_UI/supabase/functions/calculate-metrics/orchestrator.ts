import type { HabitLogRecord, Metric } from "./types.ts";
import { fetchHabitAllTimeData, fetchHabitType } from "./database.ts";
import {
  calculateDailyTotal,
  calculateWeeklyAverage,
  calculateMonthlyAverage,
  calculateStreak,
  calculateBestStreak,
  calculateGoalProgress,
  calculateActiveDays,
  calculateTotalEntriesDaily,
  calculateTotalEntriesWeekly,
  calculateTotalEntriesMonthly,
  calculateDaysCompleted30d,
  calculateAverageValue30d,
  calculateTotalEntriesAllTime,
  calculateTodayGoalsProgress,
} from "./calculator.ts";

export type HabitMetricsResult = {
  habitMetrics: Metric[];
  bestStreak: Metric | null;
  shouldDeleteHabitMetrics: boolean;
};

async function deleteBestStreakOverall(supabase: any, profileId: string) {
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

async function deleteStreakMetric(
  supabase: any,
  profileId: string,
  habitId: string,
  targetDate: string,
) {
  const { error } = await supabase
    .from("metrics")
    .delete()
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .eq("metric_type", "streak")
    .eq("granularity", "daily")
    .eq("date", targetDate);

  if (error) {
    console.error("Error deleting streak metric:", error);
  }
}

export async function calculateHabitMetrics(
  supabase: any,
  profileId: string,
  habitId: string,
  targetDate: string,
  records: HabitLogRecord[],
): Promise<HabitMetricsResult> {
  const habitMetrics: Metric[] = [];
  const habitType = await fetchHabitType(supabase, profileId, habitId);
  const isBinary = habitType === "binary";

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
  }

  const streak = await calculateStreak(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (streak) {
    habitMetrics.push(streak);
  } else {
    await deleteStreakMetric(supabase, profileId, habitId, targetDate);
  }

  const goalProgress = await calculateGoalProgress(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (goalProgress) habitMetrics.push(goalProgress);

  if (!isBinary) {
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
  }

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

  if (!isBinary) {
    const avgValue = await calculateAverageValue30d(
      supabase,
      profileId,
      habitId,
      targetDate,
    );
    if (avgValue) habitMetrics.push(avgValue);
  }

  const totalAllTime = await calculateTotalEntriesAllTime(
    supabase,
    profileId,
    habitId,
    targetDate,
  );
  if (totalAllTime) habitMetrics.push(totalAllTime);

  return { habitMetrics, bestStreak, shouldDeleteHabitMetrics: false };
}

export async function calculateProfileMetrics(
  supabase: any,
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
