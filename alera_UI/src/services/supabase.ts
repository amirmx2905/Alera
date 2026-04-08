import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
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

const nativeStorage = {
  getItem: async (key: string) => {
    const meta = await SecureStore.getItemAsync(metaKey(key));
    if (!meta) return null;
    try {
      const parsed = JSON.parse(meta) as { parts?: number };
      const parts = parsed.parts ?? 0;
      if (!parts) {
        await removeChunks(key);
        return null;
      }
      const chunks = await Promise.all(
        Array.from({ length: parts }, (_, index) =>
          SecureStore.getItemAsync(chunkKey(key, index)),
        ),
      );
      if (chunks.some((part) => part === null)) {
        await removeChunks(key);
        return null;
      }
      return chunks.join("");
    } catch {
      await removeChunks(key);
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

const webStorage = {
  getItem: async (key: string) => localStorage.getItem(key),
  setItem: async (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: async (key: string) => localStorage.removeItem(key),
};

const storage = Platform.OS === "web" ? webStorage : nativeStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
