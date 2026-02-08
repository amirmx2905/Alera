import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to your .env file.",
  );
}

const CHUNK_SIZE = 1900;
const metaKey = (key: string) => `${key}.meta`;
const chunkKey = (key: string, index: number) => `${key}.part.${index}`;

async function removeChunks(key: string) {
  const meta = await SecureStore.getItemAsync(metaKey(key));
  if (!meta) return;
  try {
    const parsed = JSON.parse(meta) as { parts?: number };
    const parts = parsed.parts ?? 0;
    await Promise.all(
      Array.from({ length: parts }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    );
  } catch {
    // ignore
  }
  await SecureStore.deleteItemAsync(metaKey(key));
}

const secureStore = {
  getItem: async (key: string) => {
    const meta = await SecureStore.getItemAsync(metaKey(key));
    if (!meta) return null;
    try {
      const parsed = JSON.parse(meta) as { parts?: number };
      const parts = parsed.parts ?? 0;
      if (!parts) return null;
      const chunks = await Promise.all(
        Array.from({ length: parts }, (_, index) =>
          SecureStore.getItemAsync(chunkKey(key, index)),
        ),
      );
      if (chunks.some((part) => part === null)) return null;
      return chunks.join("");
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    await removeChunks(key);
    const parts = Math.ceil(value.length / CHUNK_SIZE);
    await Promise.all(
      Array.from({ length: parts }, (_, index) => {
        const chunk = value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
        return SecureStore.setItemAsync(chunkKey(key, index), chunk);
      }),
    );
    await SecureStore.setItemAsync(metaKey(key), JSON.stringify({ parts }));
  },
  removeItem: async (key: string) => {
    await removeChunks(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStore,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
