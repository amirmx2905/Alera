import { supabase } from "./supabase";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con la API. Revisa tu URL y conexión.",
    );
  }

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    let errorBody: { message?: string; error?: string } | null = null;
    if (rawText) {
      try {
        errorBody = JSON.parse(rawText);
      } catch (parseError) {
        errorBody = null;
      }
    }
    const message =
      errorBody?.message ||
      errorBody?.error ||
      rawText ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
