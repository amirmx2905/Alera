/**
 * Database layer for fetching and writing data
 */

import type { HabitLogRecord, Metric } from "./types.ts";
import { getDateRangeForWindow, convertToLogicalDate } from "./utils.ts";

/**
 * Fetch all records for a specific user/habit on a specific date
 */
export async function fetchRecordsForDate(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<HabitLogRecord[]> {
  // Get UTC range for the date
  const [utcStart, utcEnd] = getDateRangeForWindow(logicalDate, 0);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;

  // Filter by logical_date (in case of timezone edge cases)
  return (data || []).filter(
    (record: HabitLogRecord) => convertToLogicalDate(record) === logicalDate,
  );
}

/**
 * Fetch historical data for a specific user/habit
 */
export async function fetchHistoricalData(
  supabase: any,
  profileId: string,
  habitId: string,
  daysBack: number,
  endDate: string,
): Promise<HabitLogRecord[]> {
  const [utcStart, utcEnd] = getDateRangeForWindow(endDate, daysBack);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch historical data for a profile across all habits
 */
export async function fetchProfileHistoricalData(
  supabase: any,
  profileId: string,
  daysBack: number,
  endDate: string,
): Promise<HabitLogRecord[]> {
  const [utcStart, utcEnd] = getDateRangeForWindow(endDate, daysBack);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all records for a profile/habits on a specific date
 */
export async function fetchProfileRecordsForDate(
  supabase: any,
  profileId: string,
  habitIds: string[],
  logicalDate: string,
): Promise<HabitLogRecord[]> {
  if (habitIds.length === 0) return [];

  const [utcStart, utcEnd] = getDateRangeForWindow(logicalDate, 0);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;

  return (data || []).filter(
    (record: HabitLogRecord) => convertToLogicalDate(record) === logicalDate,
  );
}

/**
 * Fetch historical data for a profile across specific habits
 */
export async function fetchProfileHistoricalDataForHabits(
  supabase: any,
  profileId: string,
  habitIds: string[],
  daysBack: number,
  endDate: string,
): Promise<HabitLogRecord[]> {
  if (habitIds.length === 0) return [];

  const [utcStart, utcEnd] = getDateRangeForWindow(endDate, daysBack);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all-time data for a specific profile/habit
 */
export async function fetchHabitAllTimeData(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<HabitLogRecord[]> {
  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch goal target for a habit
 */
export async function fetchHabitGoalTarget(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("target_value")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .maybeSingle();

  if (error) throw error;
  return data?.target_value ?? null;
}

/**
 * Fetch goal targets for a list of habits
 */
export async function fetchHabitGoalTargets(
  supabase: any,
  profileId: string,
  habitIds: string[],
): Promise<Record<string, number>> {
  if (habitIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_goals")
    .select("habit_id, target_value")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds);

  if (error) throw error;

  const targets: Record<string, number> = {};
  for (const row of data || []) {
    targets[row.habit_id as string] = row.target_value as number;
  }

  return targets;
}

/**
 * Write metrics to database using upsert
 */
export async function writeMetrics(
  supabase: any,
  metrics: Metric[],
): Promise<number> {
  if (metrics.length === 0) return 0;

  const habitMetrics = metrics.filter((m) => m.habit_id);
  const profileMetrics = metrics.filter((m) => !m.habit_id);

  if (habitMetrics.length > 0) {
    const habitPayload = habitMetrics.map((m) => ({
      profile_id: m.profile_id,
      habit_id: m.habit_id,
      date: m.date,
      metric_type: m.metric_type,
      granularity: m.granularity,
      value: m.value,
      metadata: JSON.stringify(m.metadata),
    }));

    const { error: habitError } = await supabase
      .from("metrics")
      .upsert(habitPayload, {
        onConflict: "profile_id,habit_id,date,metric_type,granularity",
      });

    if (habitError) throw habitError;
  }

  if (profileMetrics.length > 0) {
    const profilePayload = profileMetrics.map((m) => ({
      profile_id: m.profile_id,
      habit_id: null,
      date: m.date,
      metric_type: m.metric_type,
      granularity: m.granularity,
      value: m.value,
      metadata: JSON.stringify(m.metadata),
    }));

    const { error: profileError } = await supabase
      .from("metrics")
      .upsert(profilePayload, {
        onConflict: "profile_id,date,metric_type,granularity",
      });

    if (profileError) throw profileError;
  }

  return metrics.length;
}
