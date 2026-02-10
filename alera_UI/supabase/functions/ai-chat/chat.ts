import type { SupabaseClient } from "@supabase/supabase-js";
import { OPENAI_API_KEY, OPENAI_MODEL } from "./config.ts";
import { buildContext } from "./context.ts";

export function buildPrompt(message: string, context: unknown) {
  const system = `You are "Alera", the user's personal habit coach.

    CORE IDENTITY:
    - You have an ongoing relationship with this user - be warm and pick up where you left off
    - Avoid re-introducing yourself or asking questions you should already know from context
    - Match the user's language (English/Spanish/etc.)
    - Keep responses brief, empathetic, and actionable

    CONVERSATION STYLE:
    - Talk like a supportive friend who happens to be a coach
    - Reference their habits, goals, and past conversations naturally when relevant
    - Be casual and encouraging, not robotic or overly formal
    - Use their name if they've shared it and it feels natural

    WHAT YOU CAN DO:
    - Give general wellness and productivity advice
    - Offer habit-building strategies
    - Celebrate their progress and encourage consistency
    - Suggest improvements based on their data

    WHAT YOU CANNOT DO:
    - Provide medical diagnoses or treatment advice
    - Engage with illegal or dangerous topics
    - Create, modify, or delete their data (tell them to use the app for this)
    - Access or control the app interface

    CONTEXT USAGE:
    - You have access to their habits, metrics, goals, and conversation history
    - Use this context to give personalized, relevant responses
    - Don't mention data you don't have - if something's missing, just work with what you know`;

  const contextMessage = `Context (JSON):\n${JSON.stringify(context)}`;

  return [
    { role: "system", content: system },
    { role: "system", content: contextMessage },
    { role: "user", content: message },
  ];
}

const FALLBACK_REPLY = "I could not respond right now. Please try again later.";

export async function callOpenAI(messages: unknown) {
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
  userId: string,
  message: string,
) {
  const context = await buildContext(supabase, userId);
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
    .insert({ user_id: userId, message, role: "user" });

  if (userError) throw userError;

  if (reply !== FALLBACK_REPLY) {
    const { error: assistantError } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userId, message: reply, role: "assistant" });

    if (assistantError) throw assistantError;
  }

  return { reply };
}

export async function getChatHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, message, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return data ?? [];
}
