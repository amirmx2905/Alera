import { supabase } from "./supabase";
import { getCurrentProfileId } from "./profile";

type SupervisionLookupResult = {
  id: string;
  first_name: string;
  last_name: string;
};

export type UserSupervision = {
  id: string;
  supervisor_profile_id: string;
  monitored_profile_id: string;
  created_at: string;
};

export async function lookupProfileByToken(token: string) {
  const { data, error } = await supabase.rpc("lookup_profile_by_token", {
    p_token: token,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return (row as SupervisionLookupResult) || null;
}

export async function linkSupervisedProfile(token: string) {
  const supervisorProfileId = await getCurrentProfileId();
  const targetProfile = await lookupProfileByToken(token.trim());

  if (!targetProfile?.id) {
    throw new Error("Profile not found for token");
  }

  if (targetProfile.id === supervisorProfileId) {
    throw new Error("You cannot supervise your own profile");
  }

  const { data, error } = await supabase
    .from("user_supervision")
    .upsert(
      {
        supervisor_profile_id: supervisorProfileId,
        monitored_profile_id: targetProfile.id,
      },
      { onConflict: "supervisor_profile_id,monitored_profile_id" },
    )
    .select("id, supervisor_profile_id, monitored_profile_id, created_at")
    .single();

  if (error) throw error;

  return {
    supervision: data as UserSupervision,
    profile: targetProfile,
  };
}
