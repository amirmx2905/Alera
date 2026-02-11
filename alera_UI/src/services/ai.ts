import { supabase } from "./supabase";

type ChatResponse = {
  reply: string;
  context_used?: Record<string, boolean>;
};

export type ChatHistoryItem = {
  id?: string;
  message: string;
  role: "user" | "assistant";
  created_at?: string;
};

const AI_FUNCTION = process.env.EXPO_PUBLIC_AI_FUNCTION ?? "ai";

export async function sendChatMessage(message: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("There's no active session");
  }

  const { data, error } = await supabase.functions.invoke<ChatResponse>(
    AI_FUNCTION,
    {
      body: { action: "chat", message },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Error sending message to AI");
  }

  if (!data) {
    throw new Error("Empty response from AI");
  }

  return data;
}

export async function getChatHistory() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Theres no Active session");
  }

  const { data, error } = await supabase.functions.invoke<{
    messages: ChatHistoryItem[];
  }>(AI_FUNCTION, {
    body: { action: "history" },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Error getting AI history");
  }

  if (!data) {
    return { messages: [] };
  }

  return data;
}
