import { getCurrentProfileId } from "./profile";
import { invokeEdgeFunction } from "./edgeFunctions";

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

const AI_FUNCTION = process.env.EXPO_PUBLIC_AI_FUNCTION ?? "ai-chat";

export async function sendChatMessage(message: string, profileId?: string) {
  const resolvedProfileId = profileId ?? (await getCurrentProfileId());

  const { data } = await invokeEdgeFunction<ChatResponse>(AI_FUNCTION, {
    action: "chat",
    message,
    profile_id: resolvedProfileId,
  });

  if (!data) {
    throw new Error("Empty response from AI");
  }

  return data;
}

export async function getChatHistory(profileId?: string) {
  const resolvedProfileId = profileId ?? (await getCurrentProfileId());

  const { data } = await invokeEdgeFunction<{
    messages: ChatHistoryItem[];
  }>(AI_FUNCTION, {
    action: "history",
    profile_id: resolvedProfileId,
  });

  if (!data) {
    return { messages: [] };
  }

  return data;
}
