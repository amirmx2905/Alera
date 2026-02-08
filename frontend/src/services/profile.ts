import { supabase } from "./supabase";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("No hay sesión activa");
  }
  return data.user.id;
}

export async function getProfile() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function createProfile(username: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username })
    .select("id, username, created_at")
    .single();

  if (error) throw error;
  return data;
}
