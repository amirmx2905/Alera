// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { envInfo, supabaseAdmin } from "./config.ts";
import { getUserIdFromToken } from "./auth.ts";
import { createChatResponse, getChatHistory } from "./chat.ts";

type ReqPayload =
  | { action: "chat"; message: string; profile_id: string }
  | { action: "history"; profile_id: string };

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

    const authUserId = await getUserIdFromToken(req);

    if (!payload?.action) {
      return jsonResponse({ error: "Missing action" }, 400);
    }

    if (!("profile_id" in payload) || !payload.profile_id) {
      return jsonResponse({ error: "Missing profile_id" }, 400);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", payload.profile_id)
      .eq("auth_user_id", authUserId)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ error: "Profile not found or access denied" }, 403);
    }

    if (payload.action === "history") {
      const messages = await getChatHistory(supabaseAdmin, payload.profile_id);
      return jsonResponse({ messages });
    }

    if (payload.action === "chat") {
      if (!("message" in payload) || !payload.message) {
        return jsonResponse({ error: "Missing message" }, 400);
      }
      const result = await createChatResponse(
        supabaseAdmin,
        payload.profile_id,
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
