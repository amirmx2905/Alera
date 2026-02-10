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
  userId: string,
  habitId: string,
  logicalDate: string
): Promise<HabitLogRecord[]> {
  // Get UTC range for the date
  const [utcStart, utcEnd] = getDateRangeForWindow(logicalDate, 0);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;

  // Filter by logical_date (in case of timezone edge cases)
  return (data || []).filter(
    (record: HabitLogRecord) => convertToLogicalDate(record) === logicalDate
  );
}

/**
 * Fetch historical data for a specific user/habit
 */
export async function fetchHistoricalData(
  supabase: any,
  userId: string,
  habitId: string,
  daysBack: number,
  endDate: string
): Promise<HabitLogRecord[]> {
  const [utcStart, utcEnd] = getDateRangeForWindow(endDate, daysBack);

  const { data, error } = await supabase
    .from("habits_log")
    .select("*")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd);

  if (error) throw error;
  return data || [];
}

/**
 * Write metrics to database using upsert
 */
export async function writeMetrics(
  supabase: any,
  metrics: Metric[]
): Promise<number> {
  if (metrics.length === 0) return 0;

  const payload = metrics.map((m) => ({
    user_id: m.user_id,
    habit_id: m.habit_id,
    date: m.date,
    metric_type: m.metric_type,
    granularity: m.granularity,
    value: m.value,
    metadata: JSON.stringify(m.metadata),
  }));

  const { error } = await supabase.from("metrics").upsert(payload, {
    onConflict: "user_id,habit_id,date,metric_type,granularity",
  });

  if (error) throw error;
  return metrics.length;
}