/**
 * Database layer for fetching and writing data
 */

import type { HabitLogRecord, Metric } from "./types.ts";
import { convertToLogicalDate, getDateRangeForWindow } from "./utils.ts";

function applyLogicalTimestampWindow(
  query: any,
  utcStart: string,
  utcEnd: string,
) {
  return query.or(
    [
      `and(logged_at.gte.${utcStart},logged_at.lte.${utcEnd})`,
      `and(logged_at.is.null,created_at.gte.${utcStart},created_at.lte.${utcEnd})`,
    ].join(","),
  );
}

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

  let query = supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId);

  query = applyLogicalTimestampWindow(query, utcStart, utcEnd);

  const { data, error } = await query;

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

  let query = supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId);

  query = applyLogicalTimestampWindow(query, utcStart, utcEnd);

  const { data, error } = await query;

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

  let query = supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId);

  query = applyLogicalTimestampWindow(query, utcStart, utcEnd);

  const { data, error } = await query;

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

  let query = supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds);

  query = applyLogicalTimestampWindow(query, utcStart, utcEnd);

  const { data, error } = await query;

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

  let query = supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds);

  query = applyLogicalTimestampWindow(query, utcStart, utcEnd);

  const { data, error } = await query;

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
 * Write metrics to database using upsert
 */
export async function writeMetrics(
  supabase: any,
  metrics: Metric[],
): Promise<number> {
  if (metrics.length === 0) return 0;

  const habitMetrics = metrics.filter((m) => m.habit_id);
  const profileMetrics = metrics.filter((m) => !m.habit_id);

  const toPayload = (m: Metric) => ({
    profile_id: m.profile_id,
    habit_id: m.habit_id,
    date: m.date,
    metric_type: m.metric_type,
    granularity: m.granularity,
    value: m.value,
    metadata: m.metadata,
  });

  if (habitMetrics.length > 0) {
    const { error } = await supabase
      .from("metrics")
      .upsert(habitMetrics.map(toPayload), {
        onConflict: "profile_id,habit_id,date,metric_type,granularity",
      });
    if (error) throw error;
  }

  if (profileMetrics.length > 0) {
    const { error } = await supabase
      .from("metrics")
      .upsert(profileMetrics.map(toPayload), {
        onConflict: "profile_id,date,metric_type,granularity",
      });
    if (error) throw error;
  }

  return metrics.length;
}
