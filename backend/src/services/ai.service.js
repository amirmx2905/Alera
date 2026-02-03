const { supabase } = require("../db/supabase");
const OpenAI = require("openai");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// NOTE: Servicio de IA.

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

  const habitsQuery = supabase
    .from("habits")
    .select("id, name, type, unit")
    .eq("user_id", userId);

  const conversationsQuery = supabase
    .from("ai_conversations")
    .select("message, role, created_at")
    .eq("user_id", userId)
    .gte("created_at", last7DaysStart.toISOString())
    .order("created_at", { ascending: false });

  const goalsQuery = supabase
    .from("user_goals")
    .select("habit_id, target_value, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const [
    { data: metricsToday, error: metricsTodayError },
    { data: metricsLast7Days, error: metricsLast7DaysError },
    { data: metricsLast3Months, error: metricsLast3MonthsError },
    { data: conversations, error: convError },
    { data: goals, error: goalsError },
    { data: habits, error: habitsError },
  ] = await Promise.all([
    metricsTodayQuery,
    metricsLast7DaysQuery,
    metricsLast3MonthsQuery,
    conversationsQuery,
    goalsQuery,
    habitsQuery,
  ]);

  if (metricsTodayError) throw metricsTodayError;
  if (metricsLast7DaysError) throw metricsLast7DaysError;
  if (metricsLast3MonthsError) throw metricsLast3MonthsError;
  if (convError) throw convError;
  if (goalsError) throw goalsError;
  if (habitsError) throw habitsError;

  const habitMap = new Map((habits || []).map((habit) => [habit.id, habit]));

  const attachHabit = (items) =>
    (items || []).map((item) => ({
      ...item,
      habit: habitMap.get(item.habit_id) || null,
    }));

  return {
    metrics_today: attachHabit(metricsToday),
    metrics_last_7_days: attachHabit(metricsLast7Days),
    metrics_last_3_months: attachHabit(metricsLast3Months),
    conversations: conversations || [],
    goals: (goals || []).map((goal) => ({
      ...goal,
      habit: habitMap.get(goal.habit_id) || null,
    })),
    habits: habits || [],
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
  const goalsCount = context.goals.length;
  const reply =
    `Sorry, pero el dueño de esta app se quedó sin creditos de OpenIA jajaja... Aquí hay un resumen rápido de tu contexto:\n` +
    `- Métricas hoy: ${todayCount}\n` +
    `- Métricas últimos 7 días: ${last7Count}\n` +
    `- Métricas últimos 3 meses: ${last3MonthsCount}\n` +
    `- Conversaciones últimos 7 días: ${convCount}\n` +
    `- Objetivos actuales: ${goalsCount}\n` +
    `\n¡Intenta de nuevo cuando el dueño recargue sus créditos! 😅`;
  return reply;
}

function buildPrompt(message, context) {
  const system =
    'Eres la asistente/coach "Alera" experta en hábitos y bienestar. Responde breve, empática y accionable. ' +
    "No des diagnósticos médicos ni trates temas ilegales o peligrosos. " +
    "Puedes dar recomendaciones generales de bienestar/productividad aunque no estén en el historial, con tono amiguero y profesional. " +
    "Si el usuario pide cómo llamarlo y no es ofensivo, hazlo. Usa el contexto. " +
    "No puedes crear/modificar/eliminar datos; si pide cambiar hábitos/metas, dile que debe hacerlo en la app. " +
    "Aclara que no tienes acceso a la interfaz ni a sus secciones.";

  const contextMessage = `Contexto (JSON):\n${JSON.stringify(context)}`;

  const history = (context.conversations || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-6)
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.message,
    }));

  const input = [
    { role: "system", content: system },
    { role: "system", content: contextMessage },
    ...history,
    { role: "user", content: message },
  ];

  return { input };
}

function getErrorStatus(error) {
  return error?.status || error?.statusCode || error?.response?.status || null;
}

function getFallbackMessage(status) {
  if (status === 401) {
    return "No pude autenticarme con el proveedor de IA. Intenta más tarde.";
  }
  if (status === 429) {
    return "La IA está recibiendo muchas solicitudes. Intenta de nuevo en un momento.";
  }
  if (status && status >= 500) {
    return "La IA tuvo un problema temporal. Intenta de nuevo en unos minutos.";
  }
  return null;
}

async function callOpenAIWithRetry(input, options = {}) {
  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? 12000;

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return { response, error: null };
    } catch (error) {
      clearTimeout(timeout);
      const status = getErrorStatus(error);
      const retriable =
        status === 429 ||
        (status && status >= 500) ||
        error?.name === "AbortError";

      if (attempt >= maxRetries || !retriable) {
        return { response: null, error };
      }
    }

    attempt += 1;
  }

  return { response: null, error: new Error("OpenAI retry limit reached") };
}

/**
 * Crea respuesta del asistente y guarda conversación.
 */
async function createChatResponse(userId, message) {
  const context = await buildContext(userId);

  let reply = null;

  if (openai) {
    try {
      const { input } = buildPrompt(message, context);
      const { response, error } = await callOpenAIWithRetry(input, {
        maxRetries: 2,
        timeoutMs: 12000,
      });

      if (error) {
        throw error;
      }

      reply = response?.output_text?.trim();
    } catch (error) {
      const status = getErrorStatus(error);
      const fallback = getFallbackMessage(status);
      console.error(
        JSON.stringify({
          level: "error",
          message: "OpenAI call failed",
          error: error?.message || String(error),
          status,
          timestamp: new Date().toISOString(),
        }),
      );
      reply = fallback || null;
    }
  }

  if (!reply) {
    reply = mockAiResponse(message, context);
  }

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
      goals: true,
    },
  };
}

module.exports = { createChatResponse };

// TODO: Sanitizar y limitar contexto según tamaño/privacidad.
// TODO: Ajustar modelo y políticas de contenido si aplica.
