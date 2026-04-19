import type { HabitLogRecord, Metric } from "../shared/types.ts";
import { MONTHLY_WINDOW_DAYS } from "../shared/config.ts";
import { fetchHistoricalData, fetchRecordsForDate } from "../db/database.ts";
import {
  fetchHabitGoalConfig,
  fetchHabitGoalTarget,
} from "../db/repositories.ts";
import { convertToLogicalDate } from "../shared/utils.ts";
import {
  countMaxStreak,
  getDaysBetween,
  getMondayStartKey,
  getMonthEndKey,
  getMonthStartKey,
  getSundayDateKey,
  groupDailyTotals,
  sumValues,
} from "./helpers.ts";

export async function calculateGoalProgress(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric | null> {
  const goalConfig = await fetchHabitGoalConfig(supabase, profileId, habitId);
  if (!goalConfig) return null;

  const targetValue = Number(goalConfig.target_value ?? 0);
  if (targetValue <= 0) return null;

  let totalValue = 0;
  let periodStart = logicalDate;
  let periodEnd = logicalDate;

  if (goalConfig.goal_type === "daily") {
    const records = await fetchRecordsForDate(
      supabase,
      profileId,
      habitId,
      logicalDate,
    );
    totalValue = sumValues(records);
  } else {
    periodStart = goalConfig.goal_type === "weekly"
      ? getMondayStartKey(logicalDate)
      : getMonthStartKey(logicalDate);
    periodEnd = goalConfig.goal_type === "weekly"
      ? getSundayDateKey(logicalDate)
      : getMonthEndKey(logicalDate);

    const daysBack = getDaysBetween(periodStart, logicalDate);
    const historicalData = await fetchHistoricalData(
      supabase,
      profileId,
      habitId,
      daysBack,
      logicalDate,
    );

    const dailyTotals = groupDailyTotals(historicalData);
    const totalsByPeriod: Record<string, number> = {};

    for (const [dateKey, total] of Object.entries(dailyTotals)) {
      const periodKey = goalConfig.goal_type === "weekly"
        ? getMondayStartKey(dateKey)
        : getMonthStartKey(dateKey);
      totalsByPeriod[periodKey] = (totalsByPeriod[periodKey] || 0) + total;
    }

    totalValue = totalsByPeriod[periodStart] ?? 0;
  }

  const progressPercent = Math.min((totalValue / targetValue) * 100, 100);

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: periodEnd,
    metric_type: "goal_progress",
    granularity: goalConfig.goal_type,
    value: Math.round(progressPercent * 10) / 10,
    metadata: {
      goal_type: goalConfig.goal_type,
      target_value: targetValue,
      total_value: Math.round(totalValue * 10) / 10,
      progress_percent: Math.round(progressPercent * 10) / 10,
      period_start: periodStart,
      period_end: periodEnd,
    },
  };
}

export async function calculateGoalProgressForHabits(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
): Promise<Metric[]> {
  const metrics: Metric[] = [];
  for (const habitId of habitIds) {
    const metric = await calculateGoalProgress(
      supabase,
      profileId,
      habitId,
      logicalDate,
    );
    if (metric) metrics.push(metric);
  }
  return metrics;
}

export function calculateBestStreak(
  profileId: string,
  habitId: string,
  logicalDate: string,
  allTimeRecords: HabitLogRecord[],
): Metric | null {
  if (allTimeRecords.length === 0) return null;

  const datesWithData = Array.from(
    new Set(allTimeRecords.map((record) => convertToLogicalDate(record))),
  );

  const bestStreak = countMaxStreak(datesWithData);
  if (bestStreak === 0) return null;

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "best_streak",
    granularity: "all_time",
    value: bestStreak,
    metadata: { window: "all_time" },
  };
}

export async function calculateDaysCompleted30d(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric> {
  const targetValue = await fetchHabitGoalTarget(supabase, profileId, habitId);

  if (targetValue === null) {
    return {
      profile_id: profileId,
      habit_id: habitId,
      date: logicalDate,
      metric_type: "days_completed_30d",
      granularity: "monthly",
      value: 0,
      metadata: { window_days: MONTHLY_WINDOW_DAYS, goal_missing: true },
    };
  }

  const historicalData = await fetchHistoricalData(
    supabase,
    profileId,
    habitId,
    MONTHLY_WINDOW_DAYS - 1,
    logicalDate,
  );

  const dailyTotals = groupDailyTotals(historicalData);
  let completedDays = 0;

  for (const total of Object.values(dailyTotals)) {
    if (total >= targetValue) completedDays += 1;
  }

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "days_completed_30d",
    granularity: "monthly",
    value: completedDays,
    metadata: {
      window_days: MONTHLY_WINDOW_DAYS,
      target_value: targetValue,
      days_with_data: Object.keys(dailyTotals).length,
    },
  };
}

export async function calculateAverageValue30d(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric | null> {
  const historicalData = await fetchHistoricalData(
    supabase,
    profileId,
    habitId,
    MONTHLY_WINDOW_DAYS - 1,
    logicalDate,
  );

  const dailyTotals = groupDailyTotals(historicalData);
  const daysWithData = Object.keys(dailyTotals).length;
  const total = sumValues(historicalData);
  const average = total / MONTHLY_WINDOW_DAYS;

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "avg_value_30d",
    granularity: "monthly",
    value: Math.round(average * 10) / 10,
    metadata: {
      window_days: MONTHLY_WINDOW_DAYS,
      days_with_data: daysWithData,
      denominator_days: MONTHLY_WINDOW_DAYS,
      denominator_type: "calendar_days",
    },
  };
}

export function calculateTotalEntriesAllTime(
  profileId: string,
  habitId: string,
  logicalDate: string,
  allTimeRecords: HabitLogRecord[],
): Metric | null {
  if (allTimeRecords.length === 0) return null;

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "total_entries_all_time",
    granularity: "all_time",
    value: allTimeRecords.length,
    metadata: {
      window: "all_time",
      total_value: Math.round(sumValues(allTimeRecords) * 10) / 10,
    },
  };
}
