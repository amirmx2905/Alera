const { supabase } = require("../db/supabase");

// Servicio de métricas agregadas y análisis básico.

/**
 * Métricas diarias persistidas (tabla metrics).
 */
async function listDailyMetrics(userId, habitId, from, to) {
  let query = supabase
    .from("metrics")
    .select("date, metric_type, value")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("metric_type", "daily_average")
    .order("date", { ascending: true });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Extrae un valor numérico desde value (number o { value: number }).
 */
function getNumericValue(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.value === "number") {
    return value.value;
  }
  return null;
}

/**
 * Convierte fecha a YYYY-MM-DD.
 */
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Obtiene inicio de semana (lunes) en UTC.
 */
function getWeekStart(date) {
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - diff,
    ),
  );
  return toDateKey(start);
}

/**
 * Obtiene clave YYYY-MM para agrupación mensual.
 */
function getMonthKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Obtiene logs numéricos en un rango.
 */
async function listNumericLogs(userId, habitId, from, to) {
  let query = supabase
    .from("habits_log")
    .select("value, created_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .order("created_at", { ascending: true });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Agrupa por fecha y calcula promedio diario.
 */
function groupByDateAverage(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const numeric = getNumericValue(row.value);
    if (numeric === null) continue;
    const date = new Date(row.created_at);
    const key = toDateKey(date);
    const current = grouped.get(key) || { sum: 0, count: 0 };
    current.sum += numeric;
    current.count += 1;
    grouped.set(key, current);
  }

  return [...grouped.entries()].map(([key, value]) => ({
    key,
    value: value.sum / value.count,
  }));
}

/**
 * Promedio semanal basado en promedios diarios.
 */
async function listWeeklyMetrics(userId, habitId, from, to) {
  const rows = await listNumericLogs(userId, habitId, from, to);
  const daily = groupByDateAverage(rows);
  const grouped = new Map();

  for (const item of daily) {
    const weekKey = getWeekStart(new Date(`${item.key}T00:00:00.000Z`));
    const current = grouped.get(weekKey) || { sum: 0, count: 0 };
    current.sum += item.value;
    current.count += 1;
    grouped.set(weekKey, current);
  }

  return [...grouped.entries()].map(([week_start, value]) => ({
    week_start,
    metric_type: "weekly_average",
    value: value.sum / value.count,
  }));
}

/**
 * Promedio mensual basado en promedios diarios.
 */
async function listMonthlyMetrics(userId, habitId, from, to) {
  const rows = await listNumericLogs(userId, habitId, from, to);
  const daily = groupByDateAverage(rows);
  const grouped = new Map();

  for (const item of daily) {
    const monthKey = getMonthKey(new Date(`${item.key}T00:00:00.000Z`));
    const current = grouped.get(monthKey) || { sum: 0, count: 0 };
    current.sum += item.value;
    current.count += 1;
    grouped.set(monthKey, current);
  }

  return [...grouped.entries()].map(([month, value]) => ({
    month,
    metric_type: "monthly_average",
    value: value.sum / value.count,
  }));
}

/**
 * Compara dos períodos y retorna diferencia y %.
 */
async function comparePeriods(userId, habitId, fromA, toA, fromB, toB) {
  const [rowsA, rowsB] = await Promise.all([
    listNumericLogs(userId, habitId, fromA, toA),
    listNumericLogs(userId, habitId, fromB, toB),
  ]);

  const avgA = calculateAverage(rowsA);
  const avgB = calculateAverage(rowsB);
  const diff = avgA !== null && avgB !== null ? avgB - avgA : null;
  const pct = avgA && diff !== null ? (diff / avgA) * 100 : null;

  return {
    period_a: { from: fromA, to: toA, average: avgA },
    period_b: { from: fromB, to: toB, average: avgB },
    difference: diff,
    percentage_change: pct,
  };
}

/**
 * Calcula promedio simple de una colección de logs.
 */
function calculateAverage(rows) {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const numeric = getNumericValue(row.value);
    if (numeric === null) continue;
    sum += numeric;
    count += 1;
  }
  return count === 0 ? null : sum / count;
}

/**
 * Predicción simple por regresión lineal.
 */
async function predictNextDailyAverage(userId, habitId, days) {
  const now = new Date();
  const from = new Date(
    now.getTime() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rows = await listNumericLogs(userId, habitId, from, now.toISOString());
  const daily = groupByDateAverage(rows).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  if (daily.length < 2) {
    return { predicted_value: null, basis_days: daily.length };
  }

  const n = daily.length;
  const xs = daily.map((_, index) => index + 1);
  const ys = daily.map((item) => item.value);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const nextX = n + 1;
  const predicted = intercept + slope * nextX;

  return {
    predicted_value: predicted,
    basis_days: n,
  };
}

/**
 * Job diario: calcula promedio diario por hábito y persiste en metrics.
 */
async function calculateDailyAverageForDate(targetDate) {
  const start = new Date(`${targetDate}T00:00:00.000Z`);
  const end = new Date(`${targetDate}T23:59:59.999Z`);

  const { data, error } = await supabase
    .from("habits_log")
    .select("habit_id, user_id, value, created_at")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) throw error;

  const grouped = new Map();

  for (const row of data) {
    const numeric = getNumericValue(row.value);
    if (numeric === null) continue;

    const key = `${row.user_id}:${row.habit_id}`;
    const current = grouped.get(key) || {
      sum: 0,
      count: 0,
      user_id: row.user_id,
      habit_id: row.habit_id,
    };
    current.sum += numeric;
    current.count += 1;
    grouped.set(key, current);
  }

  const inserts = [];
  for (const item of grouped.values()) {
    const avg = item.sum / item.count;
    inserts.push({
      user_id: item.user_id,
      habit_id: item.habit_id,
      metric_type: "daily_average",
      value: avg,
      date: targetDate,
    });
  }

  if (inserts.length === 0) return [];

  const { data: metrics, error: insertError } = await supabase
    .from("metrics")
    .insert(inserts)
    .select();

  if (insertError) throw insertError;
  return metrics;
}

/**
 * Recalcula y persiste el promedio diario para un hábito y fecha específica.
 */
async function recalculateDailyAverage(userId, habitId, date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  const { data, error } = await supabase
    .from("habits_log")
    .select("value")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) throw error;

  const avg = calculateAverage(data || []);

  const { error: deleteError } = await supabase
    .from("metrics")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("metric_type", "daily_average")
    .eq("date", date);

  if (deleteError) throw deleteError;

  if (avg === null) {
    return null;
  }

  const { data: metrics, error: insertError } = await supabase
    .from("metrics")
    .insert({
      user_id: userId,
      habit_id: habitId,
      metric_type: "daily_average",
      value: avg,
      date,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return metrics;
}

module.exports = {
  listDailyMetrics,
  listWeeklyMetrics,
  listMonthlyMetrics,
  comparePeriods,
  predictNextDailyAverage,
  calculateDailyAverageForDate,
  recalculateDailyAverage,
};
