/**
 * Database layer for fetching and writing data
 */

import type { HabitLogRecord, Metric } from "../shared/types.ts";
import {
  convertToLogicalDate,
  getDateRangeForWindow,
} from "../shared/utils.ts";

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

export async function fetchRecordsForDate(
  supabase: any,
  profileId: string,
  habitId: string,
  logicalDate: string,
): Promise<HabitLogRecord[]> {
  const [utcStart, utcEnd] = getDateRangeForWindow(logicalDate, 0);

  let query = supabase
    .from("habits_log")
    .select("*")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId);

  query = applyLogicalTimestampWindow(query, utcStart, utcEnd);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).filter(
    (record: HabitLogRecord) => convertToLogicalDate(record) === logicalDate,
  );
}

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
 * Write metrics to database.
 * Tries bulk upsert first; falls back to individual update-or-insert
 * when PostgREST can't resolve partial unique indexes (error 42P10).
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
    habit_id: m.habit_id ?? null,
    date: m.date,
    metric_type: m.metric_type,
    granularity: m.granularity,
    value: m.value,
    metadata: m.metadata,
  });

  const individualUpsert = async () => {
    for (const metric of metrics) {
      const payload = toPayload(metric);
      const isProfile = !payload.habit_id;
      const match: Record<string, unknown> = {
        profile_id: payload.profile_id,
        date: payload.date,
        metric_type: payload.metric_type,
        granularity: payload.granularity,
      };
      if (!isProfile) match.habit_id = payload.habit_id;

      let q = supabase.from("metrics").update(payload).match(match);
      if (isProfile) q = q.is("habit_id", null);
      const { data: updated, error: updateError } = await q.select("id");
      if (updateError) throw updateError;

      if (!updated?.length) {
        const { error: insertError } = await supabase
          .from("metrics")
          .insert(payload);
        if (insertError) throw insertError;
      }
    }
  };

  if (habitMetrics.length > 0) {
    const payload = habitMetrics.map(toPayload);
    const { error } = await supabase.from("metrics").upsert(payload, {
      onConflict: "profile_id,habit_id,date,metric_type,granularity",
    });
    if (error) {
      if (error.code === "42P10") {
        await individualUpsert();
        return metrics.length;
      }
      throw error;
    }
  }

  if (profileMetrics.length > 0) {
    const payload = profileMetrics.map(toPayload);
    const { error } = await supabase.from("metrics").upsert(payload, {
      onConflict: "profile_id,date,metric_type,granularity",
    });
    if (error) {
      if (error.code === "42P10") {
        await individualUpsert();
        return metrics.length;
      }
      throw error;
    }
  }

  return metrics.length;
}
