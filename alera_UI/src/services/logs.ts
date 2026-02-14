import { supabase } from "./supabase";
import { getCurrentProfileId } from "./profile";
import { invokeEdgeFunction } from "./edgeFunctions";

export type LogSource = "mobile" | "watch";

export type HabitLog = {
  id: string;
  habit_id: string;
  profile_id: string;
  value: number;
  metadata: Record<string, unknown> | null;
  source: LogSource | null;
  created_at: string;
  updated_at?: string | null;
};

export type LogCreateInput = {
  value: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  source?: LogSource;
};

export type LogUpdateInput = {
  value?: number;
  metadata?: Record<string, unknown>;
  source?: LogSource;
};

const METRICS_FUNCTION =
  process.env.EXPO_PUBLIC_METRICS_FUNCTION ?? "calculate-metrics";

async function getProfileId(profileId?: string) {
  if (profileId) return profileId;
  return getCurrentProfileId();
}

async function triggerMetricsCalculation(
  habitId: string,
  profileId: string,
  logicalDate?: string,
) {
  try {
    const { data, errorMessage } = await invokeEdgeFunction(
      METRICS_FUNCTION,
      {
        habit_id: habitId,
        profile_id: profileId,
        ...(logicalDate && { logical_date: logicalDate }),
      },
      { throwOnError: false },
    );

    if (errorMessage) {
      console.error("Error calculating metrics:", errorMessage);
      return;
    }

    console.log("Metrics updated:", data);
  } catch (err) {
    console.error("Failed to trigger metrics calculation:", err);
  }
}

export async function listLogs(
  habitId: string,
  from?: string,
  to?: string,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  let query = supabase
    .from("habits_log")
    .select("id, habit_id, profile_id, value, metadata, source, created_at")
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId)
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) throw error;
  return data as HabitLog[];
}

export async function createLog(
  habitId: string,
  payload: LogCreateInput,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const insertPayload = {
    profile_id: resolvedProfileId,
    habit_id: habitId,
    value: payload.value,
    metadata: payload.metadata ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(payload.source ? { source: payload.source } : {}),
  };

  const { data, error } = await supabase
    .from("habits_log")
    .insert(insertPayload)
    .select("id, habit_id, profile_id, value, metadata, source, created_at")
    .single();

  if (error) throw error;

  // Trigger metrics recalculation (non-blocking)
  triggerMetricsCalculation(habitId, resolvedProfileId);

  return data as HabitLog;
}

export async function updateLog(
  habitId: string,
  logId: string,
  payload: LogUpdateInput,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const updates = {
    ...(payload.value !== undefined ? { value: payload.value } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    ...(payload.source ? { source: payload.source } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("habits_log")
    .update(updates)
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("profile_id", resolvedProfileId)
    .select("id, habit_id, profile_id, value, metadata, source, created_at")
    .single();

  if (error) throw error;

  // Trigger metrics recalculation (non-blocking)
  triggerMetricsCalculation(habitId, resolvedProfileId);

  return data as HabitLog;
}

export async function deleteLog(
  habitId: string,
  logId: string,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits_log")
    .delete()
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("profile_id", resolvedProfileId)
    .select("id, habit_id, profile_id, value, metadata, source, created_at");

  if (error) throw error;

  // Trigger metrics recalculation (non-blocking)
  if (data?.[0]) {
    triggerMetricsCalculation(habitId, resolvedProfileId);
  }

  return (data?.[0] as HabitLog) || null;
}
