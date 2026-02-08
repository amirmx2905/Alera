import { supabase } from "./supabase";

export type LogSource = "mobile" | "watch" | "backend" | "system";

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  value: unknown;
  metadata: Record<string, unknown> | null;
  source: LogSource | null;
  created_at: string;
  updated_at?: string | null;
};

export type LogCreateInput = {
  value: unknown;
  metadata?: Record<string, unknown>;
  created_at?: string;
  source?: LogSource;
};

export type LogUpdateInput = {
  value?: unknown;
  metadata?: Record<string, unknown>;
  source?: LogSource;
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("No hay sesión activa");
  }
  return data.user.id;
}

export async function listLogs(habitId: string, from?: string, to?: string) {
  const userId = await getCurrentUserId();
  let query = supabase
    .from("habits_log")
    .select("id, habit_id, user_id, value, metadata, source, created_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) throw error;
  return data as HabitLog[];
}

export async function createLog(habitId: string, payload: LogCreateInput) {
  const userId = await getCurrentUserId();
  const insertPayload = {
    user_id: userId,
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
    .select("id, habit_id, user_id, value, metadata, source, created_at")
    .single();

  if (error) throw error;
  return data as HabitLog;
}

export async function updateLog(
  habitId: string,
  logId: string,
  payload: LogUpdateInput,
) {
  const userId = await getCurrentUserId();
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
    .eq("user_id", userId)
    .select("id, habit_id, user_id, value, metadata, source, created_at")
    .single();

  if (error) throw error;
  return data as HabitLog;
}

export async function deleteLog(habitId: string, logId: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("habits_log")
    .delete()
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .select("id, habit_id, user_id, value, metadata, source, created_at");

  if (error) throw error;
  return (data?.[0] as HabitLog) || null;
}

export async function upsertLogByDate(
  habitId: string,
  date: string,
  payload: LogCreateInput,
) {
  const userId = await getCurrentUserId();
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  const { data: existing, error: findError } = await supabase
    .from("habits_log")
    .select("id")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;

  if (existing?.id) {
    return updateLog(habitId, existing.id, payload);
  }

  return createLog(habitId, {
    ...payload,
    created_at: start.toISOString(),
  });
}
