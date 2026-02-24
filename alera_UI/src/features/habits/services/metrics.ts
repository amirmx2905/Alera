import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";
import { invokeEdgeFunction } from "../../../services/edgeFunctions";

export type MetricGranularity = "daily" | "weekly" | "monthly" | "all_time";

export type Metric = {
  habit_id: string | null;
  date: string;
  metric_type: string;
  granularity: MetricGranularity;
  value: number;
  metadata?: Record<string, unknown> | null;
};

export type MetricsQuery = {
  metricType?: string;
  granularity?: MetricGranularity;
  from?: string;
  to?: string;
};

async function getProfileId(profileId?: string) {
  if (profileId) return profileId;
  return getCurrentProfileId();
}

export async function listMetrics(
  habitId?: string | null,
  options: MetricsQuery = {},
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const { metricType, granularity, from, to } = options;

  let query = supabase
    .from("metrics")
    .select("habit_id, date, metric_type, granularity, value, metadata")
    .eq("profile_id", resolvedProfileId)
    .order("date", { ascending: true });

  if (habitId === null) {
    query = query.is("habit_id", null);
  } else if (habitId) {
    query = query.eq("habit_id", habitId);
  }

  if (metricType) query = query.eq("metric_type", metricType);
  if (granularity) query = query.eq("granularity", granularity);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) throw error;
  return data as Metric[];
}

export async function listGoalProgressMetrics(
  habitIds: string[],
  granularity: MetricGranularity,
  date: string,
  profileId?: string,
) {
  if (habitIds.length === 0) return [] as Metric[];
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("metrics")
    .select("habit_id, date, metric_type, granularity, value, metadata")
    .eq("profile_id", resolvedProfileId)
    .in("habit_id", habitIds)
    .eq("metric_type", "goal_progress")
    .eq("granularity", granularity)
    .eq("date", date)
    .order("habit_id", { ascending: true });

  if (error) throw error;
  return data as Metric[];
}

export async function listDailyMetrics(
  habitId: string,
  from?: string,
  to?: string,
  profileId?: string,
) {
  return listMetrics(
    habitId,
    {
      metricType: "daily_total",
      granularity: "daily",
      from,
      to,
    },
    profileId,
  );
}

export async function listStreakMetrics(
  from?: string,
  to?: string,
  profileId?: string,
) {
  return listMetrics(
    undefined,
    {
      metricType: "streak",
      granularity: "daily",
      from,
      to,
    },
    profileId,
  );
}

const METRICS_FUNCTION =
  process.env.EXPO_PUBLIC_METRICS_FUNCTION ?? "calculate-metrics";

export async function recalculateProfileMetrics(profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, errorMessage } = await invokeEdgeFunction(
    METRICS_FUNCTION,
    {
      profile_id: resolvedProfileId,
    },
    { throwOnError: false },
  );

  if (errorMessage) {
    console.error("Error recalculating profile metrics:", errorMessage);
  }

  return data;
}
