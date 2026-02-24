/**
 * Utility functions for authentication and datetime handling
 */

import { createClient } from "@supabase/supabase-js";
import { TIMEZONE } from "./config.ts";
import type { HabitLogRecord } from "./types.ts";

function toDateKeyForTimezone(value: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return value.toISOString().split("T")[0];
  }

  return `${year}-${month}-${day}`;
}

// ===========================================================================
// AUTHENTICATION UTILITIES
// ===========================================================================

/**
 * Extract Bearer token from Authorization header
 */
export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

/**
 * Get user ID from JWT token
 */
export async function getUserIdFromToken(req: Request): Promise<string> {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("Missing auth token");
  }

  // Create admin client to validate token
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    console.error("auth.getUser error", error);
    throw new Error("Invalid auth token");
  }

  return data.user.id;
}

// ===========================================================================
// DATETIME UTILITIES
// ===========================================================================

/**
 * Get today's date in CDMX timezone
 */
export function getTodayInCDMX(): string {
  return toDateKeyForTimezone(new Date(), TIMEZONE);
}

/**
 * Convert UTC timestamp to logical_date in CDMX
 * Prioritizes logged_at if present, otherwise uses created_at
 */
export function convertToLogicalDate(record: HabitLogRecord): string {
  const timestamp = record.logged_at || record.created_at;
  return toDateKeyForTimezone(new Date(timestamp), TIMEZONE);
}

/**
 * Get UTC date range for a window of days
 */
export function getDateRangeForWindow(
  endDate: string,
  daysBack: number,
): [string, string] {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);

  const utcStart = new Date(
    `${start.toISOString().split("T")[0]}T00:00:00-06:00`,
  ).toISOString();
  const utcEnd = new Date(`${endDate}T23:59:59.999-06:00`).toISOString();

  return [utcStart, utcEnd];
}
