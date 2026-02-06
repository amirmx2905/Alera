const { supabase } = require("../db/supabase");

// Servicio de métricas agregadas y análisis básico.

/**
 * Lista métricas procesadas (tabla metrics).
 */
async function listMetrics(userId, habitId, options = {}) {
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
  return data;
}

/**
 * Métricas diarias persistidas (tabla metrics).
 */
async function listDailyMetrics(userId, habitId, from, to) {
  return listMetrics(userId, habitId, {
    metricType: "daily_average",
    granularity: "daily",
    from,
    to,
  });
}
module.exports = {
  listMetrics,
  listDailyMetrics,
};
