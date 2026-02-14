import { supabase } from "./supabase";

export type Profile = {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  sex: "male" | "female" | "other" | null;
  supervision_token: string;
  created_at: string;
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("No hay sesión activa");
  }
  return data.user.id;
}

async function getCurrentProfileId(): Promise<string> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userId)
    .single();

  if (error || !data?.id) {
    throw new Error("No profile found for current user");
  }

  return data.id as string;
}

export async function listProfiles(): Promise<Profile[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, first_name, last_name, birth_date, sex, supervision_token, created_at",
    )
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as Profile[]) || [];
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, auth_user_id, first_name, last_name, birth_date, sex, supervision_token, created_at",
      )
      .eq("auth_user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return (data as Profile) || null;
  } catch {
    return null;
  }
}

export async function createProfile(
  firstName: string,
  lastName: string,
  birthDate?: string | null,
  sex?: "male" | "female" | "other" | null,
) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: userId,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate ?? null,
      sex: sex ?? null,
    })
    .select(
      "id, auth_user_id, first_name, last_name, birth_date, sex, supervision_token, created_at",
    )
    .single();

  if (error) throw error;
  return data as Profile;
}

export { getCurrentProfileId };
