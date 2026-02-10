/**
 * Metrics calculation logic
 */

import type { HabitLogRecord, Metric } from "./types.ts";
import { WEEKLY_WINDOW_DAYS, MONTHLY_WINDOW_DAYS, STREAK_LOOKBACK_DAYS } from "./config.ts";
import { fetchHistoricalData } from "./database.ts";
import { convertToLogicalDate } from "./utils.ts";

/**
 * Calculate daily_total
 */
export function calculateDailyTotal(
  userId: string,
  habitId: string,
  records: HabitLogRecord[],
  logicalDate: string
): Metric | null {
  if (records.length === 0) return null;

  const total = records.reduce((sum, r) => sum + (r.value || 0), 0);

  return {
    user_id: userId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "daily_total",
    granularity: "daily",
    value: Math.round(total * 10) / 10,
    metadata: { record_count: records.length },
  };
}

/**
 * Calculate weekly_average
 */
export async function calculateWeeklyAverage(
  supabase: any,
  userId: string,
  habitId: string,
  logicalDate: string
): Promise<Metric | null> {
  const historicalData = await fetchHistoricalData(
    supabase,
    userId,
    habitId,
    WEEKLY_WINDOW_DAYS - 1,
    logicalDate
  );

  if (historicalData.length === 0) return null;

  // Group by logical_date
  const dailyTotals: Record<string, number> = {};
  for (const record of historicalData) {
    const recordLogicalDate = convertToLogicalDate(record);
    dailyTotals[recordLogicalDate] =
      (dailyTotals[recordLogicalDate] || 0) + (record.value || 0);
  }

  const daysWithData = Object.keys(dailyTotals).length;
  if (daysWithData === 0) return null;

  const windowSize = Math.min(WEEKLY_WINDOW_DAYS, daysWithData);
  const weeklyAvg =
    Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) /
    daysWithData;

  // Calculate Sunday
  const date = new Date(logicalDate);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  const sundayDate = sunday.toISOString().split("T")[0];

  return {
    user_id: userId,
    habit_id: habitId,
    date: sundayDate,
    metric_type: "weekly_average",
    granularity: "weekly",
    value: Math.round(weeklyAvg * 10) / 10,
    metadata: {
      days_with_data: daysWithData,
      window_size: windowSize,
    },
  };
}

/**
 * Calculate monthly_average
 */
export async function calculateMonthlyAverage(
  supabase: any,
  userId: string,
  habitId: string,
  logicalDate: string
): Promise<Metric | null> {
  const historicalData = await fetchHistoricalData(
    supabase,
    userId,
    habitId,
    MONTHLY_WINDOW_DAYS - 1,
    logicalDate
  );

  if (historicalData.length === 0) return null;

  // Group by logical_date
  const dailyTotals: Record<string, number> = {};
  for (const record of historicalData) {
    const recordLogicalDate = convertToLogicalDate(record);
    dailyTotals[recordLogicalDate] =
      (dailyTotals[recordLogicalDate] || 0) + (record.value || 0);
  }

  const daysWithData = Object.keys(dailyTotals).length;
  if (daysWithData === 0) return null;

  const windowSize = Math.min(MONTHLY_WINDOW_DAYS, daysWithData);
  const monthlyAvg =
    Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) /
    daysWithData;

  // Calculate last day of month
  const date = new Date(logicalDate);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const lastDayOfMonth = lastDay.toISOString().split("T")[0];

  return {
    user_id: userId,
    habit_id: habitId,
    date: lastDayOfMonth,
    metric_type: "monthly_average",
    granularity: "monthly",
    value: Math.round(monthlyAvg * 10) / 10,
    metadata: {
      days_with_data: daysWithData,
      window_size: windowSize,
    },
  };
}

/**
 * Calculate streak
 */
export async function calculateStreak(
  supabase: any,
  userId: string,
  habitId: string,
  logicalDate: string
): Promise<Metric | null> {
  const historicalData = await fetchHistoricalData(
    supabase,
    userId,
    habitId,
    STREAK_LOOKBACK_DAYS,
    logicalDate
  );

  if (historicalData.length === 0) return null;

  // Get unique dates
  const datesWithData = new Set<string>();
  for (const record of historicalData) {
    datesWithData.add(convertToLogicalDate(record));
  }

  const sortedDates = Array.from(datesWithData)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (sortedDates.length === 0) return null;

  // Calculate consecutive days
  const currentDate = new Date(logicalDate);
  let streak = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - i);

    const expectedStr = expectedDate.toISOString().split("T")[0];
    const actualStr = sortedDates[i].toISOString().split("T")[0];

    if (expectedStr === actualStr) {
      streak++;
    } else {
      break;
    }
  }

  if (streak === 0) return null;

  return {
    user_id: userId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "streak",
    granularity: "daily",
    value: streak,
    metadata: { consecutive_days: streak },
  };
}