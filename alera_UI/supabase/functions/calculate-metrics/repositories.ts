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

  return Array.from(new Set((data || []).map((row) => row.habit_id as string)));
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
