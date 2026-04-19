import type { HabitLogRecord, Metric } from "../shared/types.ts";
import {
  MONTHLY_WINDOW_DAYS,
  STREAK_LOOKBACK_DAYS,
  WEEKLY_WINDOW_DAYS,
} from "../shared/config.ts";
import { fetchHistoricalData } from "../db/database.ts";
import { fetchHabitGoalConfig } from "../db/repositories.ts";
import {
  getMondayStartKey,
  getMonthEndKey,
  getMonthStartKey,
  getSundayDateKey,
  groupDailyTotals,
  parseDateKey,
  toDateKey,
} from "./helpers.ts";

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

async function calculatePeriodAverage(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
  windowDays: number,
  granularity: "weekly" | "monthly",
): Promise<Metric | null> {
  const historicalData = await fetchHistoricalData(
    supabase,
    profileId,
    habitId,
    windowDays - 1,
    logicalDate,
  );

  if (historicalData.length === 0) return null;

  const dailyTotals = groupDailyTotals(historicalData);
  const daysWithData = Object.keys(dailyTotals).length;
  if (daysWithData === 0) return null;

  const windowSize = Math.min(windowDays, daysWithData);
  const avg = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) /
    daysWithData;

  const periodEndDate = granularity === "weekly"
    ? getSundayDateKey(logicalDate)
    : getMonthEndKey(logicalDate);

  return {
    profile_id: profileId,
    habit_id: habitId,
    date: periodEndDate,
    metric_type: `${granularity}_average`,
    granularity,
    value: Math.round(avg * 10) / 10,
    metadata: { days_with_data: daysWithData, window_size: windowSize },
  };
}

export function calculateWeeklyAverage(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
) {
  return calculatePeriodAverage(
    supabase,
    profileId,
    habitId,
    logicalDate,
    WEEKLY_WINDOW_DAYS,
    "weekly",
  );
}

export function calculateMonthlyAverage(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
) {
  return calculatePeriodAverage(
    supabase,
    profileId,
    habitId,
    logicalDate,
    MONTHLY_WINDOW_DAYS,
    "monthly",
  );
}

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
          : total > 0
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
    const periodKey = goalConfig.goal_type === "weekly"
      ? getMondayStartKey(dateKey)
      : getMonthStartKey(dateKey);
    totalsByPeriod[periodKey] = (totalsByPeriod[periodKey] || 0) + total;
  }

  const currentPeriodKey = goalConfig.goal_type === "weekly"
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
