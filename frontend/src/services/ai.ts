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
    throw new Error("No hay sesión activa");
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
    throw new Error(error.message || "Error al enviar mensaje a IA");
  }

  if (!data) {
    throw new Error("Respuesta vacía de IA");
  }

  return data;
}

export async function getChatHistory() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("No hay sesión activa");
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
    throw new Error(error.message || "Error al obtener historial de IA");
  }

  if (!data) {
    return { messages: [] };
  }

  return data;
}
