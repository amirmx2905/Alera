import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";

export type PredictionType =
  | "streak_risk"
  | "trajectory"
  | "goal_eta"
  | "best_reminder";

export type PredictionRow = {
  habit_id: string;
  prediction_type: PredictionType;
  date: string;
  value: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

async function getProfileId(profileId?: string) {
  if (profileId) return profileId;
  return getCurrentProfileId();
}

export async function listHabitPredictions(
  habitId: string,
  profileId?: string,
  limit = 120,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("predictions")
    .select("habit_id, prediction_type, date, value, metadata, created_at")
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PredictionRow[];
}
