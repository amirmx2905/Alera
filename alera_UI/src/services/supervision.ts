import { supabase } from "./supabase";
import { getCurrentProfileId } from "./profile";

type SupervisionLookupResult = {
  id: string;
  first_name: string;
  last_name: string;
};

type UserSupervision = {
  id: string;
  supervisor_profile_id: string;
  monitored_profile_id: string;
  created_at: string;
};

type SupervisionJoinRow = {
  id: string;
  monitored_profile_id?: string;
  supervisor_profile_id?: string;
  created_at: string;
  unlink_requested_at: string | null;
  profiles: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

export type SupervisedUser = {
  supervisionId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  linkedAt: string;
  unlinkRequestedAt: string | null;
};

export type MySupervisor = {
  supervisionId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  linkedAt: string;
  unlinkRequestedAt: string | null;
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

export async function getMySupervised(): Promise<SupervisedUser[]> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from("user_supervision")
    .select(
      "id, monitored_profile_id, created_at, unlink_requested_at, profiles:monitored_profile_id(first_name, last_name)",
    )
    .eq("supervisor_profile_id", myProfileId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data as SupervisionJoinRow[]) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    return {
      supervisionId: row.id as string,
      profileId: row.monitored_profile_id as string,
      firstName: (profile?.first_name ?? "") as string,
      lastName: (profile?.last_name ?? "") as string,
      linkedAt: row.created_at as string,
      unlinkRequestedAt: (row.unlink_requested_at as string) ?? null,
    };
  });
}

export async function removeSupervisedLink(
  supervisionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_supervision")
    .delete()
    .eq("id", supervisionId);

  if (error) throw error;
}

export async function checkIsSupervised(): Promise<boolean> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from("user_supervision")
    .select("id")
    .eq("monitored_profile_id", myProfileId)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function getMySupervisors(): Promise<MySupervisor[]> {
  const myProfileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from("user_supervision")
    .select(
      "id, supervisor_profile_id, created_at, unlink_requested_at, profiles:supervisor_profile_id(first_name, last_name)",
    )
    .eq("monitored_profile_id", myProfileId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data as SupervisionJoinRow[]) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    return {
      supervisionId: row.id as string,
      profileId: row.supervisor_profile_id as string,
      firstName: (profile?.first_name ?? "") as string,
      lastName: (profile?.last_name ?? "") as string,
      linkedAt: row.created_at as string,
      unlinkRequestedAt: (row.unlink_requested_at as string) ?? null,
    };
  });
}

export async function requestUnlink(supervisionId: string): Promise<void> {
  const { error } = await supabase
    .from("user_supervision")
    .update({ unlink_requested_at: new Date().toISOString() })
    .eq("id", supervisionId);

  if (error) throw error;
}

export async function denyUnlinkRequest(supervisionId: string): Promise<void> {
  const { error } = await supabase
    .from("user_supervision")
    .update({ unlink_requested_at: null })
    .eq("id", supervisionId);

  if (error) throw error;
}
