import type { Metric } from "./types.ts";
import { getTodayInCDMX } from "./utils.ts";
import { fetchRecordsForDate, writeMetrics } from "./database.ts";
import { calculateGoalProgressForHabits } from "./calculator.ts";
import {
  calculateHabitMetrics,
  calculateProfileMetrics,
} from "./orchestrator.ts";
import {
  deleteHabitMetrics,
  fetchActiveHabitIds,
  fetchHabitIdsWithLogs,
} from "./repositories.ts";
import { logEvent, nowMs } from "./telemetry.ts";

type RunMetricsPipelineParams = {
  supabase: any;
  profileId: string;
  habitId?: string;
  logicalDate?: string;
};

type RunMetricsPipelineResult = {
  success: true;
  profile_id: string;
  habit_id: string | null;
  logical_date: string;
  records_found: number;
  metrics_calculated: number;
  metrics_written: number;
  metrics_deleted: boolean;
  metrics: Array<{ type: string; value: number }>;
};

export async function runMetricsPipeline({
  supabase,
  profileId,
  habitId,
  logicalDate,
}: RunMetricsPipelineParams): Promise<RunMetricsPipelineResult> {
  const startedAtMs = nowMs();
  const isProfileOnly = !habitId;
  const targetDate = logicalDate || getTodayInCDMX();

  logEvent("info", "metrics.pipeline.start", {
    profile_id: profileId,
    habit_id: habitId ?? null,
    logical_date: targetDate,
    mode: isProfileOnly ? "profile" : "habit",
  });

  const records = isProfileOnly
    ? []
    : await fetchRecordsForDate(supabase, profileId, habitId, targetDate);

  logEvent("info", "metrics.pipeline.records", {
    profile_id: profileId,
    habit_id: habitId ?? null,
    records_found: records.length,
  });

  let habitMetrics: Metric[] = [];
  let bestStreak: Metric | null = null;
  let shouldDeleteHabitMetrics = false;

  if (!isProfileOnly && habitId) {
    const result = await calculateHabitMetrics(
      supabase,
      profileId,
      habitId,
      targetDate,
      records,
    );
    habitMetrics = result.habitMetrics;
    bestStreak = result.bestStreak;
    shouldDeleteHabitMetrics = result.shouldDeleteHabitMetrics;
  }

  const activeHabitIds = await fetchActiveHabitIds(supabase, profileId);

  if (isProfileOnly && activeHabitIds.length > 0) {
    const goalProgressMetrics = await calculateGoalProgressForHabits(
      supabase,
      profileId,
      activeHabitIds,
      targetDate,
    );
    habitMetrics.push(...goalProgressMetrics);
  }

  const habitIdsWithLogs = await fetchHabitIdsWithLogs(
    supabase,
    profileId,
    activeHabitIds,
  );

  const profileMetrics = await calculateProfileMetrics(
    supabase,
    profileId,
    targetDate,
    activeHabitIds,
    habitIdsWithLogs,
    bestStreak,
  );

  const metrics: Metric[] = [...habitMetrics, ...profileMetrics];
  logEvent("info", "metrics.pipeline.calculated", {
    profile_id: profileId,
    habit_id: habitId ?? null,
    metrics_calculated: metrics.length,
  });

  let habitMetricsDeleted = false;
  if (
    !isProfileOnly &&
    habitId &&
    (habitMetrics.length === 0 || shouldDeleteHabitMetrics)
  ) {
    logEvent("info", "metrics.pipeline.habit_metrics.delete", {
      profile_id: profileId,
      habit_id: habitId,
      reason:
        habitMetrics.length === 0
          ? "no_habit_metrics"
          : "should_delete_habit_metrics",
    });
    habitMetricsDeleted = await deleteHabitMetrics(
      supabase,
      profileId,
      habitId,
    );
  }

  const written = await writeMetrics(supabase, metrics);

  const elapsedMs = nowMs() - startedAtMs;
  logEvent("info", "metrics.pipeline.success", {
    profile_id: profileId,
    habit_id: habitId ?? null,
    logical_date: targetDate,
    records_found: records.length,
    metrics_calculated: metrics.length,
    metrics_written: written,
    metrics_deleted: habitMetricsDeleted,
    duration_ms: elapsedMs,
  });

  return {
    success: true,
    profile_id: profileId,
    habit_id: habitId ?? null,
    logical_date: targetDate,
    records_found: records.length,
    metrics_calculated: metrics.length,
    metrics_written: written,
    metrics_deleted: habitMetricsDeleted,
    metrics: metrics.map((metric) => ({
      type: metric.metric_type,
      value: metric.value,
    })),
  };
}
