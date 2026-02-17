import { supabaseAdmin } from "./config.ts";

export function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function getUserIdFromToken(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("Missing auth token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    console.error("auth.getUser error", error);
    throw new Error("Invalid auth token");
  }

  return data.user.id;
}
