import { apiFetch } from "./api";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export async function getProfile() {
  return apiFetch<Profile | null>("/profile");
}

export async function createProfile(username: string) {
  return apiFetch<Profile>("/profile", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}
