/**
 * Database layer for fetching and writing data
 */

import type { HabitLogRecord, Metric } from "./types.ts";
import { getDateRangeForWindow, convertToLogicalDate } from "./utils.ts";

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

export type HabitGoalConfig = {
  target_value: number;
  goal_type: "daily" | "weekly" | "monthly";
};

export type HabitType = "numeric" | "binary";

/**
 * Fetch goal target and goal type for a habit
 */
export async function fetchHabitGoalConfig(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<HabitGoalConfig | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("target_value, goal_type")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    target_value: Number(data.target_value ?? 0),
    goal_type: data.goal_type as "daily" | "weekly" | "monthly",
  };
}

/**
 * Fetch habit type
 */
export async function fetchHabitType(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<HabitType | null> {
  const { data, error } = await supabase
    .from("habits")
    .select("type")
    .eq("profile_id", profileId)
    .eq("id", habitId)
    .maybeSingle();

  if (error) throw error;
  return (data?.type as HabitType) ?? null;
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

  const legacyUpsert = async () => {
    const upsertMetric = async (
      payload: Record<string, unknown>,
      match: Record<string, unknown>,
      isProfileMetric: boolean,
    ) => {
      let updateQuery = supabase.from("metrics").update(payload).match(match);
      if (isProfileMetric) {
        updateQuery = updateQuery.is("habit_id", null);
      }

      const { data: updated, error: updateError } =
        await updateQuery.select("id");
      if (updateError) throw updateError;

      if (updated?.length) return;

      const { error: insertError } = await supabase
        .from("metrics")
        .insert(payload);

      if (insertError) throw insertError;
    };

    if (habitMetrics.length > 0) {
      for (const metric of habitMetrics) {
        const payload = {
          profile_id: metric.profile_id,
          habit_id: metric.habit_id,
          date: metric.date,
          metric_type: metric.metric_type,
          granularity: metric.granularity,
          value: metric.value,
          metadata: metric.metadata,
        };
        await upsertMetric(
          payload,
          {
            profile_id: metric.profile_id,
            habit_id: metric.habit_id,
            date: metric.date,
            metric_type: metric.metric_type,
            granularity: metric.granularity,
          },
          false,
        );
      }
    }

    if (profileMetrics.length > 0) {
      for (const metric of profileMetrics) {
        const payload = {
          profile_id: metric.profile_id,
          habit_id: null,
          date: metric.date,
          metric_type: metric.metric_type,
          granularity: metric.granularity,
          value: metric.value,
          metadata: metric.metadata,
        };
        await upsertMetric(
          payload,
          {
            profile_id: metric.profile_id,
            date: metric.date,
            metric_type: metric.metric_type,
            granularity: metric.granularity,
          },
          true,
        );
      }
    }
  };

  if (habitMetrics.length > 0) {
    const payload = habitMetrics.map((metric) => ({
      profile_id: metric.profile_id,
      habit_id: metric.habit_id,
      date: metric.date,
      metric_type: metric.metric_type,
      granularity: metric.granularity,
      value: metric.value,
      metadata: metric.metadata,
    }));
    const { error } = await supabase.from("metrics").upsert(payload, {
      onConflict: "profile_id,habit_id,date,metric_type,granularity",
    });
    if (error) {
      if (error.code === "42P10") {
        await legacyUpsert();
        return metrics.length;
      }
      throw error;
    }
  }

  if (profileMetrics.length > 0) {
    const payload = profileMetrics.map((metric) => ({
      profile_id: metric.profile_id,
      habit_id: null,
      date: metric.date,
      metric_type: metric.metric_type,
      granularity: metric.granularity,
      value: metric.value,
      metadata: metric.metadata,
    }));
    const { error } = await supabase.from("metrics").upsert(payload, {
      onConflict: "profile_id,date,metric_type,granularity",
    });
    if (error) {
      if (error.code === "42P10") {
        await legacyUpsert();
        return metrics.length;
      }
      throw error;
    }
  }

  return metrics.length;
}
