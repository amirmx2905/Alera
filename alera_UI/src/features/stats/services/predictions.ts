import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";
import { ensureArray } from "../../../services/handleServiceError";

export type PredictionType =
  | "streak_risk"
  | "trajectory"
  | "goal_eta"
  | "best_reminder";

export type Prediction = {
  id: string;
  habit_id: string;
  profile_id: string;
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

/**
 * Fetch the most recent best_reminder prediction for every habit
 * belonging to the given profile. Returns one row per habit.
 */
export async function getAllBestReminders(
  profileId?: string,
): Promise<(Prediction & { habit_name: string })[]> {
  const resolvedProfileId = await getProfileId(profileId);

  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, habit_id, profile_id, prediction_type, date, value, metadata, created_at, habits!inner(name)",
    )
    .eq("profile_id", resolvedProfileId)
    .eq("prediction_type", "best_reminder")
    .order("date", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Keep only the latest row per habit
  const seen = new Set<string>();
  const unique: (Prediction & { habit_name: string })[] = [];

  for (const row of data) {
    if (seen.has(row.habit_id)) continue;
    seen.add(row.habit_id);
    const habitData = row.habits as unknown as { name: string };
    unique.push({
      id: row.id,
      habit_id: row.habit_id,
      profile_id: row.profile_id,
      prediction_type: row.prediction_type as PredictionType,
      date: row.date,
      value: row.value as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown> | null,
      created_at: row.created_at,
      habit_name: habitData.name,
    });
  }

  return unique;
}

export async function getLatestPredictions(
  habitId: string,
  profileId?: string,
): Promise<Prediction[]> {
  const resolvedProfileId = await getProfileId(profileId);

  // Fetch the most recent date that has predictions for this habit
  const { data: latest, error: latestErr } = await supabase
    .from("predictions")
    .select("date")
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId)
    .order("date", { ascending: false })
    .limit(1);

  if (latestErr) throw latestErr;
  if (!latest || latest.length === 0) return [];

  const latestDate = latest[0].date;

  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, habit_id, profile_id, prediction_type, date, value, metadata, created_at",
    )
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId)
    .eq("date", latestDate);

  if (error) throw error;
  return ensureArray<Prediction>(
    data ?? [],
    "Unexpected response from getLatestPredictions",
  );
}
