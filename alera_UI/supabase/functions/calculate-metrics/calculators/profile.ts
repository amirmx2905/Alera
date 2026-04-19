import type { HabitLogRecord, Metric } from "../shared/types.ts";
import { MONTHLY_WINDOW_DAYS, WEEKLY_WINDOW_DAYS } from "../shared/config.ts";
import {
  fetchProfileHistoricalData,
  fetchProfileHistoricalDataForHabits,
  fetchProfileRecordsForDate,
} from "../db/database.ts";
import { fetchHabitGoalTargets } from "../db/repositories.ts";
import { convertToLogicalDate } from "../shared/utils.ts";
import {
  getMonthEndKey,
  getSundayDateKey,
  groupTotalsByHabit,
  sumValues,
} from "./helpers.ts";

async function calculateTotalEntries(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
  granularity: "daily" | "weekly" | "monthly",
): Promise<Metric> {
  let records: HabitLogRecord[];
  let periodDate: string;
  let windowDays: number | undefined;

  if (granularity === "daily") {
    records = await fetchProfileRecordsForDate(
      supabase,
      profileId,
      habitIds,
      logicalDate,
    );
    periodDate = logicalDate;
  } else {
    windowDays = granularity === "weekly"
      ? WEEKLY_WINDOW_DAYS
      : MONTHLY_WINDOW_DAYS;
    records = await fetchProfileHistoricalDataForHabits(
      supabase,
      profileId,
      habitIds,
      windowDays - 1,
      logicalDate,
    );
    periodDate = granularity === "weekly"
      ? getSundayDateKey(logicalDate)
      : getMonthEndKey(logicalDate);
  }

  const totalValue = sumValues(records);

  return {
    profile_id: profileId,
    habit_id: null,
    date: periodDate,
    metric_type: "total_entries",
    granularity,
    value: records.length,
    metadata: {
      habit_count: habitIds.length,
      ...(windowDays ? { window_days: windowDays } : {}),
      total_value: Math.round(totalValue * 10) / 10,
    },
  };
}

export function calculateTotalEntriesDaily(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
) {
  return calculateTotalEntries(
    supabase,
    profileId,
    habitIds,
    logicalDate,
    "daily",
  );
}

export function calculateTotalEntriesWeekly(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
) {
  return calculateTotalEntries(
    supabase,
    profileId,
    habitIds,
    logicalDate,
    "weekly",
  );
}

export function calculateTotalEntriesMonthly(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
) {
  return calculateTotalEntries(
    supabase,
    profileId,
    habitIds,
    logicalDate,
    "monthly",
  );
}

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
