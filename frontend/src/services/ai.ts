import { apiFetch } from "./api";

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

export async function sendChatMessage(message: string) {
  return apiFetch<ChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getChatHistory() {
  return apiFetch<{ messages: ChatHistoryItem[] }>("/ai/history");
}
