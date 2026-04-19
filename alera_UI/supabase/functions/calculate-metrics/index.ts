/**
 * Alera Metrics Pipeline - Main Handler
 *
 * Real-time metrics calculation triggered after habit logging.
 * Extracts auth user from JWT, calculates all metrics, and writes to database.
 */

import type { RequestBody } from "./types.ts";
import { getUserIdFromToken } from "./utils.ts";
import { createClient } from "@supabase/supabase-js";
import { ensureHabitAccess, ensureProfileAccess } from "./authz.ts";
import { runMetricsPipeline } from "./pipeline.ts";
import { logEvent } from "./telemetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

const corsPreflightResponse = () =>
  new Response(null, { status: 204, headers: corsHeaders });

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const createSupabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getErrorStatus(message: string) {
  const isAuthError = message.includes("auth token") ||
    message.includes("Invalid auth");
  return isAuthError ? 401 : 500;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  logEvent("info", "metrics.http.start");

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { habit_id, profile_id, logical_date } = body;
    const isProfileOnly = !habit_id;

    if (!profile_id) {
      return jsonResponse({ error: "profile_id is required" }, 400);
    }

    // Get auth user id from JWT token
    const auth_user_id = await getUserIdFromToken(req);

    // Initialize Supabase client with service role
    const supabase = createSupabaseClient();

    try {
      await ensureProfileAccess(supabase, auth_user_id, profile_id);
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Access denied" },
        403,
      );
    }

    if (!isProfileOnly) {
      try {
        await ensureHabitAccess(supabase, profile_id, habit_id);
      } catch (error) {
        return jsonResponse(
          { error: error instanceof Error ? error.message : "Access denied" },
          403,
        );
      }
    }

    const result = await runMetricsPipeline({
      supabase,
      profileId: profile_id,
      habitId: habit_id,
      logicalDate: logical_date,
    });

    logEvent("info", "metrics.http.success", {
      profile_id: result.profile_id,
      habit_id: result.habit_id,
      logical_date: result.logical_date,
    });

    return jsonResponse(result);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const status = getErrorStatus(errorMessage);

    logEvent("error", "metrics.http.error", {
      error: errorMessage,
      status,
    });

    return jsonResponse(
      {
        success: false,
        error: errorMessage,
      },
      status,
    );
  }
});
