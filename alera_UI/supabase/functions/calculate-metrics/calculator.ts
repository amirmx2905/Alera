/**
 * Metrics calculation logic
 */

import type { HabitLogRecord, Metric } from "./types.ts";
import {
  WEEKLY_WINDOW_DAYS,
  MONTHLY_WINDOW_DAYS,
  STREAK_LOOKBACK_DAYS,
} from "./config.ts";
import {
  fetchHistoricalData,
  fetchProfileHistoricalData,
  fetchHabitAllTimeData,
  fetchProfileRecordsForDate,
  fetchProfileHistoricalDataForHabits,
  fetchRecordsForDate,
  fetchHabitGoalTarget,
  fetchHabitGoalConfig,
  fetchHabitGoalTargets,
} from "./database.ts";
import { convertToLogicalDate } from "./utils.ts";

function countMaxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 1);

    if (
      sorted[i].toISOString().split("T")[0] === prev.toISOString().split("T")[0]
    ) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function sumValues(records: HabitLogRecord[]): number {
  return records.reduce((sum, record) => sum + (record.value || 0), 0);
}

function groupDailyTotals(records: HabitLogRecord[]): Record<string, number> {
  const dailyTotals: Record<string, number> = {};
  for (const record of records) {
    const recordLogicalDate = convertToLogicalDate(record);
    dailyTotals[recordLogicalDate] =
      (dailyTotals[recordLogicalDate] || 0) + (record.value || 0);
  }
  return dailyTotals;
}

function groupTotalsByHabit(records: HabitLogRecord[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const record of records) {
    totals[record.habit_id] =
      (totals[record.habit_id] || 0) + (record.value || 0);
  }
  return totals;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function getMondayStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return toDateKey(date);
}

function getMonthStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getSundayDateKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  return toDateKey(date);
}

function getMonthEndKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return toDateKey(lastDay);
}

function getDaysBetween(startKey: string, endKey: string): number {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Calculate daily_total
 */
export function calculateDailyTotal(
  profileId: string,
  habitId: string,
  records: HabitLogRecord[],
  logicalDate: string,
): Metric | null {
  if (records.length === 0) return null;

  const total = records.reduce((sum, r) => sum + (r.value || 0), 0);

  return {
    profile_id: profileId,
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
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric | null> {
  const historicalData = await fetchHistoricalData(
    supabase,
    profileId,
    habitId,
    WEEKLY_WINDOW_DAYS - 1,
    logicalDate,
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
    profile_id: profileId,
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
    profile_id: profileId,
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
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric | null> {
  const goalConfig = await fetchHabitGoalConfig(supabase, profileId, habitId);
  if (!goalConfig) return null;
  if (goalConfig.goal_type !== "daily" && goalConfig.target_value <= 0) {
    return null;
  }

  const historicalData = await fetchHistoricalData(
    supabase,
    profileId,
    habitId,
    STREAK_LOOKBACK_DAYS,
    logicalDate,
  );

  if (historicalData.length === 0) return null;

  const dailyTotals = groupDailyTotals(historicalData);

  if (goalConfig.goal_type === "daily") {
    const completedDates = Object.entries(dailyTotals)
      .filter(([, total]) =>
        goalConfig.target_value > 0
          ? total >= goalConfig.target_value
          : total > 0,
      )
      .map(([dateKey]) => dateKey);

    const sortedDates = completedDates
      .map((d) => parseDateKey(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDates.length === 0) return null;

    const currentDate = parseDateKey(logicalDate);
    let streak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - i);

      const expectedStr = toDateKey(expectedDate);
      const actualStr = toDateKey(sortedDates[i]);

      if (expectedStr === actualStr) {
        streak++;
      } else {
        break;
      }
    }

    if (streak === 0) return null;

    return {
      profile_id: profileId,
      habit_id: habitId,
      date: logicalDate,
      metric_type: "streak",
      granularity: "daily",
      value: streak,
      metadata: { consecutive_days: streak },
    };
  }

  const totalsByPeriod: Record<string, number> = {};
  for (const [dateKey, total] of Object.entries(dailyTotals)) {
    const periodKey =
      goalConfig.goal_type === "weekly"
        ? getMondayStartKey(dateKey)
        : getMonthStartKey(dateKey);
    totalsByPeriod[periodKey] = (totalsByPeriod[periodKey] || 0) + total;
  }

  const currentPeriodKey =
    goalConfig.goal_type === "weekly"
      ? getMondayStartKey(logicalDate)
      : getMonthStartKey(logicalDate);

  if ((totalsByPeriod[currentPeriodKey] ?? 0) < goalConfig.target_value) {
    return null;
  }

  let cursorKey = currentPeriodKey;

  let streak = 0;
  while (true) {
    const total = totalsByPeriod[cursorKey] ?? 0;
    if (total < goalConfig.target_value) break;
    streak += 1;

    const cursorDate = parseDateKey(cursorKey);
    if (goalConfig.goal_type === "weekly") {
      cursorDate.setDate(cursorDate.getDate() - 7);
      cursorKey = getMondayStartKey(toDateKey(cursorDate));
    } else {
      cursorDate.setMonth(cursorDate.getMonth() - 1);
      cursorKey = getMonthStartKey(toDateKey(cursorDate));
    }
  }

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "streak",
    granularity: "daily",
    value: streak,
    metadata: {
      period: goalConfig.goal_type,
      target_value: goalConfig.target_value,
    },
  };
}

/**
 * Calculate goal progress for a habit based on its goal type
 */
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
    periodStart =
      goalConfig.goal_type === "weekly"
        ? getMondayStartKey(logicalDate)
        : getMonthStartKey(logicalDate);
    periodEnd =
      goalConfig.goal_type === "weekly"
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
      const periodKey =
        goalConfig.goal_type === "weekly"
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

/**
 * Calculate best streak for a habit over all time
 */
export async function calculateBestStreak(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric | null> {
  const historicalData = await fetchHabitAllTimeData(
    supabase,
    profileId,
    habitId,
  );

  if (historicalData.length === 0) return null;

  const datesWithData = Array.from(
    new Set(historicalData.map((record) => convertToLogicalDate(record))),
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
    metadata: {
      window: "all_time",
    },
  };
}

/**
 * Calculate total entries for active habits on a specific day (profile-level)
 */
export async function calculateTotalEntriesDaily(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
): Promise<Metric> {
  const records = await fetchProfileRecordsForDate(
    supabase,
    profileId,
    habitIds,
    logicalDate,
  );
  const totalValue = sumValues(records);

  return {
    profile_id: profileId,
    habit_id: null,
    date: logicalDate,
    metric_type: "total_entries",
    granularity: "daily",
    value: records.length,
    metadata: {
      habit_count: habitIds.length,
      total_value: Math.round(totalValue * 10) / 10,
    },
  };
}

/**
 * Calculate total entries for active habits over the weekly window (profile-level)
 */
export async function calculateTotalEntriesWeekly(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
): Promise<Metric> {
  const records = await fetchProfileHistoricalDataForHabits(
    supabase,
    profileId,
    habitIds,
    WEEKLY_WINDOW_DAYS - 1,
    logicalDate,
  );
  const totalValue = sumValues(records);

  // Calculate Sunday
  const date = new Date(logicalDate);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  const sundayDate = sunday.toISOString().split("T")[0];

  return {
    profile_id: profileId,
    habit_id: null,
    date: sundayDate,
    metric_type: "total_entries",
    granularity: "weekly",
    value: records.length,
    metadata: {
      habit_count: habitIds.length,
      window_days: WEEKLY_WINDOW_DAYS,
      total_value: Math.round(totalValue * 10) / 10,
    },
  };
}

/**
 * Calculate total entries for active habits over the monthly window (profile-level)
 */
export async function calculateTotalEntriesMonthly(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
): Promise<Metric> {
  const records = await fetchProfileHistoricalDataForHabits(
    supabase,
    profileId,
    habitIds,
    MONTHLY_WINDOW_DAYS - 1,
    logicalDate,
  );
  const totalValue = sumValues(records);

  // Calculate last day of month
  const date = new Date(logicalDate);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const lastDayOfMonth = lastDay.toISOString().split("T")[0];

  return {
    profile_id: profileId,
    habit_id: null,
    date: lastDayOfMonth,
    metric_type: "total_entries",
    granularity: "monthly",
    value: records.length,
    metadata: {
      habit_count: habitIds.length,
      window_days: MONTHLY_WINDOW_DAYS,
      total_value: Math.round(totalValue * 10) / 10,
    },
  };
}

/**
 * Calculate days completed over the monthly window (per habit)
 */
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
      metadata: {
        window_days: MONTHLY_WINDOW_DAYS,
        goal_missing: true,
      },
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

/**
 * Calculate average value over the monthly window (per habit)
 */
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

  if (historicalData.length === 0) return null;

  const dailyTotals = groupDailyTotals(historicalData);
  const daysWithData = Object.keys(dailyTotals).length;
  if (daysWithData === 0) return null;

  const average =
    Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) /
    daysWithData;

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
    },
  };
}

/**
 * Calculate total entries over all time (per habit)
 */
export async function calculateTotalEntriesAllTime(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<Metric | null> {
  const historicalData = await fetchHabitAllTimeData(
    supabase,
    profileId,
    habitId,
  );

  if (historicalData.length === 0) return null;

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: logicalDate,
    metric_type: "total_entries_all_time",
    granularity: "all_time",
    value: historicalData.length,
    metadata: {
      window: "all_time",
      total_value: Math.round(sumValues(historicalData) * 10) / 10,
    },
  };
}

/**
 * Calculate today's goals progress across active habits (profile-level)
 */
export async function calculateTodayGoalsProgress(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
): Promise<Metric[]> {
  if (habitIds.length === 0) {
    return [
      {
        profile_id: profileId,
        habit_id: null,
        date: logicalDate,
        metric_type: "completed_habits_today",
        granularity: "daily",
        value: 0,
        metadata: { total_active: 0, goal_missing: 0 },
      },
      {
        profile_id: profileId,
        habit_id: null,
        date: logicalDate,
        metric_type: "all_goals_completed_today",
        granularity: "daily",
        value: 0,
        metadata: { total_active: 0, goal_missing: 0 },
      },
    ];
  }

  const targets = await fetchHabitGoalTargets(supabase, profileId, habitIds);
  const records = await fetchProfileRecordsForDate(
    supabase,
    profileId,
    habitIds,
    logicalDate,
  );

  const totalsByHabit = groupTotalsByHabit(records);
  let completed = 0;
  let goalMissing = 0;

  for (const habitId of habitIds) {
    const target = targets[habitId];
    if (target === undefined) {
      goalMissing += 1;
      continue;
    }

    const total = totalsByHabit[habitId] || 0;
    if (total >= target) completed += 1;
  }

  const totalActive = habitIds.length;
  const allCompleted = goalMissing === 0 && completed === totalActive;

  return [
    {
      profile_id: profileId,
      habit_id: null,
      date: logicalDate,
      metric_type: "completed_habits_today",
      granularity: "daily",
      value: completed,
      metadata: { total_active: totalActive, goal_missing: goalMissing },
    },
    {
      profile_id: profileId,
      habit_id: null,
      date: logicalDate,
      metric_type: "all_goals_completed_today",
      granularity: "daily",
      value: allCompleted ? 1 : 0,
      metadata: { total_active: totalActive, goal_missing: goalMissing },
    },
  ];
}

/**
 * Calculate active days over the monthly window (profile-level)
 */
export async function calculateActiveDays(
  supabase: any,
  profileId: string,
  logicalDate: string,
): Promise<Metric> {
  const historicalData = await fetchProfileHistoricalData(
    supabase,
    profileId,
    MONTHLY_WINDOW_DAYS - 1,
    logicalDate,
  );

  const datesWithData = new Set<string>();
  for (const record of historicalData) {
    datesWithData.add(convertToLogicalDate(record));
  }

  return {
    profile_id: profileId,
    habit_id: null,
    date: logicalDate,
    metric_type: "active_days",
    granularity: "monthly",
    value: datesWithData.size,
    metadata: {
      window_days: MONTHLY_WINDOW_DAYS,
    },
  };
}
