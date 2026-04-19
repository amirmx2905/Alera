import type { SupabaseClient } from "@supabase/supabase-js";
import { OPENAI_API_KEY, OPENAI_MODEL } from "./config.ts";
import { buildContext } from "./context.ts";

type ChatMessage = { role: string; content: string };
type ConversationEntry = { message: string; role: string };

export function buildPrompt(
  message: string,
  context: Record<string, unknown>,
) {
  const { conversation_history, today, ...dataContext } = context;
  const history = (conversation_history ?? []) as ConversationEntry[];

  const system = `You are "Alera", the user's personal habit coach.
Today's date: ${today}

CORE IDENTITY:
- You have an ongoing relationship with this user — be warm and pick up where you left off
- Never re-introduce yourself or repeat questions you already know the answer to
- Match the user's language (English/Spanish/etc.)
- Keep responses brief (2-4 sentences), empathetic, and actionable
- Use their name naturally when it feels right

CONVERSATION STYLE:
- Talk like a supportive friend who happens to be a coach
- Reference their habits, streaks, goals, and past conversations naturally
- Be casual and encouraging, not robotic or formal
- Celebrate wins, gently address slips, and always suggest a next step

WHAT YOU CAN DO:
- Give wellness and productivity advice grounded in their data
- Offer habit-building strategies and pattern insights
- Celebrate progress, encourage consistency, explain trends
- Interpret predictions (streak risk, trajectory, goal ETA)

WHAT YOU CANNOT DO:
- Provide medical diagnoses or treatment advice
- Engage with illegal or dangerous topics
- Create, modify, or delete their data — tell them to use the app
- Access or control the app interface
- Make up data you don't have — work only with what's available

DATA REFERENCE:
The context JSON includes their habits (with descriptions), goals (with goal_type: daily/weekly/monthly), current metrics snapshot, 7-day trends, 3-month daily totals, and ML predictions.

Metric types in metrics_snapshot:
- daily_total: today's logged value for a habit
- streak: consecutive days/periods meeting the goal
- goal_progress: percentage toward the goal (0-100)
- weekly_average / monthly_average: avg daily value over 7/30 days
- best_streak: longest streak ever for a habit
- days_completed_30d: days meeting the goal in last 30 days
- avg_value_30d: average daily value over last 30 days
- total_entries_all_time: total log entries ever
- completed_habits_today: habits that met their goal today
- all_goals_completed_today: 1 if every goal met, 0 otherwise
- active_days: days with any activity in last 30 days
- best_streak_overall: best streak across all habits

Prediction types (if available):
- streak_risk: probability of breaking a streak (high = needs encouragement or reworking goals)
- trajectory: trend direction for a habit
- goal_eta: estimated days to reach a goal
- best_reminder: suggested optimal reminder time

Habit types: numeric (tracked with values and units) or binary (done/not done).

HOW TO USE THE DATA:
- Streaks and goal_progress are great for motivation
- Compare daily_total to the goal's target_value to give progress updates
- Use averages to discuss trends ("your weekly average is up!")
- Mention streak_risk if it's high — help them stay on track
- days_completed_30d / 30 gives a completion rate
- If best_streak > current streak, reference their personal best as motivation
- Use habit descriptions and created_at to personalize advice`;

  const contextMessage = `Context (JSON):\n${JSON.stringify(dataContext)}`;

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "system", content: contextMessage },
  ];

  // Inject recent conversation as actual messages for natural continuation
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.message });
  }

  messages.push({ role: "user", content: message });

  return messages;
}

const FALLBACK_REPLY = "I could not respond right now. Please try again later.";

export async function callOpenAI(messages: ChatMessage[]) {
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing");
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error response", {
      status: response.status,
      body: errorText,
    });
    throw new Error(errorText || "OpenAI error");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function createChatResponse(
  supabase: SupabaseClient,
  profileId: string,
  message: string,
) {
  const context = await buildContext(supabase, profileId);
  const messages = buildPrompt(message, context);

  let reply: string | null = null;
  try {
    reply = await callOpenAI(messages);
  } catch (error) {
    console.error("OpenAI call failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    reply = null;
  }

  if (!reply) {
    reply = FALLBACK_REPLY;
  }

  const { error: userError } = await supabase
    .from("ai_conversations")
    .insert({ profile_id: profileId, message, role: "user" });

  if (userError) throw userError;

  if (reply !== FALLBACK_REPLY) {
    const { error: assistantError } = await supabase
      .from("ai_conversations")
      .insert({ profile_id: profileId, message: reply, role: "assistant" });

    if (assistantError) throw assistantError;
  }

  return { reply };
}

export async function getChatHistory(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, message, role, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return data ?? [];
}
