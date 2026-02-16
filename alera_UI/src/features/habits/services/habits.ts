import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";
import { invokeEdgeFunction } from "../../../services/edgeFunctions";

export type HabitType = "numeric";
export type HabitStatus = "active" | "paused" | "archived";
export type GoalType = "daily" | "weekly" | "monthly";

export type Habit = {
  id: string;
  profile_id: string;
  category_id: string | null;
  name: string;
  description: string;
  type: HabitType;
  unit: string | null;
  status: HabitStatus;
  created_at: string;
  updated_at: string | null;
};

export type HabitCreateInput = {
  category_id: string | null;
  name: string;
  description: string;
  type: HabitType;
  unit?: string | null;
  status?: HabitStatus;
};

export type HabitUpdateInput = {
  category_id?: string | null;
  name?: string;
  description?: string;
  type?: HabitType;
  unit?: string | null;
  status?: HabitStatus;
};

export type HabitGoalRow = {
  goal_type: GoalType;
  target_value: number;
};

export type HabitRow = Habit & {
  category?: { id: string; name: string } | null;
  user_goals?: HabitGoalRow[] | null;
};

const METRICS_FUNCTION =
  process.env.EXPO_PUBLIC_METRICS_FUNCTION ?? "calculate-metrics";

const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function getProfileId(profileId?: string) {
  if (profileId) return profileId;
  return getCurrentProfileId();
}

export async function listHabits(profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits")
    .select(
      "id, profile_id, category_id, name, description, type, unit, status, created_at, updated_at, category:category_id ( id, name ), user_goals ( goal_type, target_value )",
    )
    .eq("profile_id", resolvedProfileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as HabitRow[];
}

export async function getHabit(habitId: string, profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits")
    .select(
      "id, profile_id, category_id, name, description, type, unit, status, created_at, updated_at",
    )
    .eq("id", habitId)
    .eq("profile_id", resolvedProfileId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as Habit) || null;
}

export async function findHabitByName(name: string, profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits")
    .select(
      "id, profile_id, category_id, name, description, type, unit, status, created_at, updated_at",
    )
    .eq("profile_id", resolvedProfileId)
    .eq("name", name)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as Habit) || null;
}

export async function createHabit(
  payload: HabitCreateInput,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const insertPayload = {
    profile_id: resolvedProfileId,
    category_id: payload.category_id ?? null,
    name: payload.name,
    description: payload.description,
    type: payload.type,
    unit: payload.unit ?? null,
    ...(payload.status ? { status: payload.status } : {}),
  };

  const { data, error } = await supabase
    .from("habits")
    .insert(insertPayload)
    .select(
      "id, profile_id, category_id, name, description, type, unit, status, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data as Habit;
}

export async function updateHabit(
  habitId: string,
  payload: HabitUpdateInput,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const updates = {
    ...(payload.category_id !== undefined
      ? { category_id: payload.category_id }
      : {}),
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.description !== undefined
      ? { description: payload.description }
      : {}),
    ...(payload.type ? { type: payload.type } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId)
    .eq("profile_id", resolvedProfileId)
    .select(
      "id, profile_id, category_id, name, description, type, unit, status, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data as Habit;
}

export async function archiveHabit(habitId: string, profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { error } = await supabase
    .from("habits")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("profile_id", resolvedProfileId);

  if (error) throw error;
}

export async function deleteHabit(habitId: string, profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("profile_id", resolvedProfileId)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Habit not deleted. Check permissions or ownership.");
  }

  try {
    await invokeEdgeFunction(
      METRICS_FUNCTION,
      {
        profile_id: resolvedProfileId,
        logical_date: toLocalDateKey(new Date()),
      },
      { throwOnError: false },
    );
  } catch (err) {
    console.error("Failed to recalculate profile metrics:", err);
  }
}
