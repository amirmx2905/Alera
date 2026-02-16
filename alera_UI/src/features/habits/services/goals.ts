import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";
import { type GoalType } from "./habits";

export type Goal = {
  id: string;
  habit_id: string;
  profile_id: string;
  goal_type: GoalType;
  target_value: number;
  created_at: string;
  updated_at?: string | null;
};

async function getProfileId(profileId?: string) {
  if (profileId) return profileId;
  return getCurrentProfileId();
}

export async function upsertGoal(
  habitId: string,
  targetValue: number,
  goalType: GoalType = "daily",
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("user_goals")
    .upsert(
      {
        profile_id: resolvedProfileId,
        habit_id: habitId,
        goal_type: goalType,
        target_value: targetValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id" },
    )
    .select(
      "id, habit_id, profile_id, goal_type, target_value, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function getGoal(habitId: string, profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("user_goals")
    .select(
      "id, habit_id, profile_id, goal_type, target_value, created_at, updated_at",
    )
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as Goal) || null;
}

export async function deleteGoal(habitId: string, profileId?: string) {
  const resolvedProfileId = await getProfileId(profileId);
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId);

  if (error) throw error;
}
