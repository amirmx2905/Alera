import { supabase } from "./supabase";

export type HabitType = "numeric" | "json";
export type HabitStatus = "active" | "paused" | "archived";

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  type: HabitType;
  unit: string | null;
  status: HabitStatus;
  created_at: string;
  updated_at: string | null;
};

export type HabitCreateInput = {
  name: string;
  type: HabitType;
  unit?: string | null;
  status?: HabitStatus;
};

export type HabitUpdateInput = {
  name?: string;
  type?: HabitType;
  unit?: string | null;
  status?: HabitStatus;
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("No hay sesión activa");
  }
  return data.user.id;
}

export async function listHabits() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("habits")
    .select("id, user_id, name, type, unit, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Habit[];
}

export async function getHabit(habitId: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("habits")
    .select("id, user_id, name, type, unit, status, created_at, updated_at")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as Habit) || null;
}

export async function findHabitByName(name: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("habits")
    .select("id, user_id, name, type, unit, status, created_at, updated_at")
    .eq("user_id", userId)
    .eq("name", name)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as Habit) || null;
}

export async function createHabit(payload: HabitCreateInput) {
  const userId = await getCurrentUserId();
  const insertPayload = {
    user_id: userId,
    name: payload.name,
    type: payload.type,
    unit: payload.unit ?? null,
    ...(payload.status ? { status: payload.status } : {}),
  };

  const { data, error } = await supabase
    .from("habits")
    .insert(insertPayload)
    .select("id, user_id, name, type, unit, status, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as Habit;
}

export async function updateHabit(habitId: string, payload: HabitUpdateInput) {
  const userId = await getCurrentUserId();
  const updates = {
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.type ? { type: payload.type } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId)
    .eq("user_id", userId)
    .select("id, user_id, name, type, unit, status, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as Habit;
}

export async function archiveHabit(habitId: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("habits")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}
