const { supabase } = require("../db/supabase");

// NOTE: Servicio de IA (mock actual). Contexto limitado para el MVP.

/**
 * Construye contexto limitado para la consulta.
 */
async function buildContext(userId) {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last3MonthsStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate()),
  );

  const metricsTodayQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .gte("date", todayStart.toISOString().slice(0, 10))
    .lte("date", todayEnd.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const metricsLast7DaysQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .gte("date", last7DaysStart.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const metricsLast3MonthsQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .gte("date", last3MonthsStart.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const conversationsQuery = supabase
    .from("ai_conversations")
    .select("message, role, created_at")
    .eq("user_id", userId)
    .gte("created_at", last7DaysStart.toISOString())
    .order("created_at", { ascending: false });

  const [
    { data: metricsToday, error: metricsTodayError },
    { data: metricsLast7Days, error: metricsLast7DaysError },
    { data: metricsLast3Months, error: metricsLast3MonthsError },
    { data: conversations, error: convError },
  ] = await Promise.all([
    metricsTodayQuery,
    metricsLast7DaysQuery,
    metricsLast3MonthsQuery,
    conversationsQuery,
  ]);

  if (metricsTodayError) throw metricsTodayError;
  if (metricsLast7DaysError) throw metricsLast7DaysError;
  if (metricsLast3MonthsError) throw metricsLast3MonthsError;
  if (convError) throw convError;

  return {
    metrics_today: metricsToday || [],
    metrics_last_7_days: metricsLast7Days || [],
    metrics_last_3_months: metricsLast3Months || [],
    conversations: conversations || [],
  };
}

/**
 * Respuesta mock mientras no se integra OpenAI.
 */
function mockAiResponse(message, context) {
  const todayCount = context.metrics_today.length;
  const last7Count = context.metrics_last_7_days.length;
  const last3MonthsCount = context.metrics_last_3_months.length;
  const convCount = context.conversations.length;
  const reply = `Gracias por tu consulta. Tengo ${todayCount} métricas de hoy, ${last7Count} de los últimos 7 días y ${last3MonthsCount} de los últimos 3 meses. Conversaciones recientes: ${convCount}. Preguntaste: "${message}".`;
  return reply;
}

/**
 * Crea respuesta del asistente y guarda conversación.
 */
async function createChatResponse(userId, message) {
  const context = await buildContext(userId);

  const reply = mockAiResponse(message, context);

  await supabase.from("ai_conversations").insert([
    { user_id: userId, message, role: "user" },
    { user_id: userId, message: reply, role: "assistant" },
  ]);

  return {
    reply,
    context_used: {
      metrics_today: true,
      metrics_last_7_days: true,
      metrics_last_3_months: true,
      conversations_last_7_days: true,
    },
  };
}

module.exports = { createChatResponse };

// TODO: Integración real con OpenAI usando OPENAI_API_KEY (mantener mock como fallback).
// TODO: Sanitizar y limitar contexto, definir modelo y manejar errores del proveedor.
