export type HabitGoalConfig = {
  target_value: number;
  goal_type: "daily" | "weekly" | "monthly";
};

export type HabitType = "numeric" | "binary";

export async function fetchActiveHabitIds(supabase: any, profileId: string) {
  const { data, error } = await supabase
    .from("habits")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "active");

  if (error) throw error;
  return (data || []).map((row: { id: string }) => row.id);
}

export async function fetchHabitIdsWithLogs(
  supabase: any,
  profileId: string,
  habitIds: string[],
) {
  if (habitIds.length === 0) return [] as string[];

  const { data, error } = await supabase
    .from("habits_log")
    .select("habit_id")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds);

  if (error) throw error;

  return Array.from(
    new Set((data || []).map((row: { habit_id: string }) => row.habit_id)),
  ) as string[];
}

export async function deleteHabitMetrics(
  supabase: any,
  profileId: string,
  habitId: string,
) {
  const { error } = await supabase
    .from("metrics")
    .delete()
    .eq("profile_id", profileId)
    .eq("habit_id", habitId);

  if (error) {
    console.error("Error deleting metrics:", error);
    return false;
  }

  return true;
}

export async function fetchHabitGoalTarget(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("target_value")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .maybeSingle();

  if (error) throw error;
  return data?.target_value ?? null;
}

export async function fetchHabitGoalConfig(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<HabitGoalConfig | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("target_value, goal_type")
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    target_value: Number(data.target_value ?? 0),
    goal_type: data.goal_type as "daily" | "weekly" | "monthly",
  };
}

export async function fetchHabitType(
  supabase: any,
  profileId: string,
  habitId: string,
): Promise<HabitType | null> {
  const { data, error } = await supabase
    .from("habits")
    .select("type")
    .eq("profile_id", profileId)
    .eq("id", habitId)
    .maybeSingle();

  if (error) throw error;
  return (data?.type as HabitType) ?? null;
}

export async function fetchHabitGoalTargets(
  supabase: any,
  profileId: string,
  habitIds: string[],
): Promise<Record<string, number>> {
  if (habitIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_goals")
    .select("habit_id, target_value")
    .eq("profile_id", profileId)
    .in("habit_id", habitIds);

  if (error) throw error;

  const targets: Record<string, number> = {};
  for (const row of data || []) {
    targets[row.habit_id as string] = row.target_value as number;
  }

  return targets;
}

export async function deleteBestStreakOverall(
  supabase: any,
  profileId: string,
) {
  const { error } = await supabase
    .from("metrics")
    .delete()
    .eq("profile_id", profileId)
    .is("habit_id", null)
    .eq("metric_type", "best_streak_overall");

  if (error) {
    console.error("Error deleting best_streak_overall:", error);
  }
}

export async function deleteStreakMetric(
  supabase: any,
  profileId: string,
  habitId: string,
  targetDate: string,
) {
  const { error } = await supabase
    .from("metrics")
    .delete()
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .eq("metric_type", "streak")
    .eq("granularity", "daily")
    .eq("date", targetDate);

  if (error) {
    console.error("Error deleting streak metric:", error);
  }
}
