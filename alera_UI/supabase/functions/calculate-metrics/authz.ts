export async function ensureProfileAccess(
  supabase: any,
  authUserId: string,
  profileId: string,
) {
  const { data: ownedProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (ownedProfile) return;

  const { data: supervisorProfiles, error: supervisorError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId);

  if (supervisorError) {
    throw supervisorError;
  }

  const supervisorIds = (supervisorProfiles || []).map((row) => row.id);
  if (supervisorIds.length === 0) {
    throw new Error("Profile not found or access denied");
  }

  const { data: supervision, error: supervisionError } = await supabase
    .from("user_supervision")
    .select("id")
    .eq("monitored_profile_id", profileId)
    .in("supervisor_profile_id", supervisorIds)
    .maybeSingle();

  if (supervisionError) {
    throw supervisionError;
  }

  if (!supervision) {
    throw new Error("Profile not found or access denied");
  }
}

export async function ensureHabitAccess(
  supabase: any,
  profileId: string,
  habitId: string,
) {
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("profile_id", profileId)
    .single();

  if (habitError || !habit) {
    throw new Error("Habit not found or access denied");
  }
}
