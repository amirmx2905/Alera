/**
 * Alera Metrics Pipeline - Main Handler
 *
 * Real-time metrics calculation triggered after habit logging.
 * Extracts auth user from JWT, calculates all metrics, and writes to database.
 */

import { serve } from "std/http/server.ts";
import type { RequestBody } from "./types.ts";
import { getUserIdFromToken } from "./utils.ts";
import { createSupabaseClient } from "./client.ts";
import { ensureHabitAccess, ensureProfileAccess } from "./authz.ts";
import { jsonResponse } from "./response.ts";
import { runMetricsPipeline } from "./pipeline.ts";
import { getErrorMessage, getErrorStatus } from "./errors.ts";
import { logEvent } from "./telemetry.ts";

serve(async (req) => {
  logEvent("info", "metrics.http.start");

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { habit_id, profile_id, logical_date } = body;
    const isProfileOnly = !habit_id;

    if (!profile_id) {
      return jsonResponse({ error: "profile_id is required" }, { status: 400 });
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
        { status: 403 },
      );
    }

    if (!isProfileOnly) {
      try {
        await ensureHabitAccess(supabase, profile_id, habit_id);
      } catch (error) {
        return jsonResponse(
          { error: error instanceof Error ? error.message : "Access denied" },
          { status: 403 },
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
      { status },
    );
  }
});
