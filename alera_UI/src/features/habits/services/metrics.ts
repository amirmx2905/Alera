import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";

export type MetricGranularity = "daily" | "weekly" | "monthly" | "all_time";

export type Metric = {
  date: string;
  metric_type: string;
  granularity: MetricGranularity;
  value: number;
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
    .select("date, metric_type, granularity, value")
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

export async function listDailyMetrics(
  habitId: string,
  from?: string,
  to?: string,
  profileId?: string,
) {
  return listMetrics(
    habitId,
    {
      metricType: "daily_average",
      granularity: "daily",
      from,
      to,
    },
    profileId,
  );
}
