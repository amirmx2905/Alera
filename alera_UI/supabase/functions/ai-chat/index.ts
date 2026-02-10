// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { envInfo, supabaseAdmin } from "./config.ts";
import { getUserIdFromToken } from "./auth.ts";
import { createChatResponse, getChatHistory } from "./chat.ts";

type ReqPayload = { action: "chat"; message: string } | { action: "history" };

console.info("env", envInfo);
console.info("server started");

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      Connection: "keep-alive",
    },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as ReqPayload;
    console.info("request", { action: payload?.action });

    const userId = await getUserIdFromToken(req);

    if (!payload?.action) {
      return jsonResponse({ error: "Missing action" }, 400);
    }

    if (payload.action === "history") {
      const messages = await getChatHistory(supabaseAdmin, userId);
      return jsonResponse({ messages });
    }

    if (payload.action === "chat") {
      if (!("message" in payload) || !payload.message) {
        return jsonResponse({ error: "Missing message" }, 400);
      }
      const result = await createChatResponse(
        supabaseAdmin,
        userId,
        payload.message,
      );
      return jsonResponse(result);
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("handler error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
