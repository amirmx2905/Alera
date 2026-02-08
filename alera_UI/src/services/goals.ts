import { supabase } from "./supabase";
import {
  createHabit,
  findHabitByName,
  type Habit,
  type HabitCreateInput,
} from "./habits";

export type Goal = {
  id: string;
  habit_id: string;
  user_id: string;
  target_value: number;
  created_at: string;
  updated_at?: string | null;
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("No hay sesión activa");
  }
  return data.user.id;
}

export async function upsertGoal(habitId: string, targetValue: number) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("user_goals")
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        target_value: targetValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id" },
    )
    .select("id, habit_id, user_id, target_value, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function getGoal(habitId: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("user_goals")
    .select("id, habit_id, user_id, target_value, created_at, updated_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as Goal) || null;
}

export async function deleteGoal(habitId: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", habitId);

  if (error) throw error;
}

export async function createGoalWithHabit(
  habit: HabitCreateInput,
  targetValue: number,
) {
  const existing = await findHabitByName(habit.name);
  const habitRow: Habit = existing ?? (await createHabit(habit));
  const goal = await upsertGoal(habitRow.id, targetValue);
  return { habit: habitRow, goal };
}
