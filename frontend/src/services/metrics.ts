import { supabase } from "./supabase";

export type MetricGranularity = "daily" | "weekly" | "monthly";

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

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("No hay sesión activa");
  }
  return data.user.id;
}

export async function listMetrics(habitId: string, options: MetricsQuery = {}) {
  const userId = await getCurrentUserId();
  const { metricType, granularity, from, to } = options;

  let query = supabase
    .from("metrics")
    .select("date, metric_type, granularity, value")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .order("date", { ascending: true });

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
) {
  return listMetrics(habitId, {
    metricType: "daily_average",
    granularity: "daily",
    from,
    to,
  });
}
