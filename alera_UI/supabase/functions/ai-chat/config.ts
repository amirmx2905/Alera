import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
export const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

export const envInfo = {
  hasSBUrl: Boolean(SUPABASE_URL),
  hasServiceKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
  hasOpenAIKey: Boolean(OPENAI_API_KEY),
};

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);
