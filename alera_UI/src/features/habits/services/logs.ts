import { supabase } from "../../../services/supabase";
import { getCurrentProfileId } from "../../../services/profile";
import { invokeEdgeFunction } from "../../../services/edgeFunctions";
import { ensureArray, ensureObject } from "../../../services/handleServiceError";
import { toLocalDateKey } from "../utils/dates";

export type LogSource = "mobile" | "watch";

export type HabitLog = {
  id: string;
  habit_id: string;
  profile_id: string;
  value: number;
  source: LogSource | null;
  logged_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type LogCreateInput = {
  value: number;
  source?: LogSource;
  logged_at?: string | null;
};

export type LogUpdateInput = {
  value?: number;
  source?: LogSource;
  logged_at?: string | null;
};

const METRICS_FUNCTION =
  process.env.EXPO_PUBLIC_METRICS_FUNCTION ?? "calculate-metrics";

function getEffectiveTimestamp(
  log: Pick<HabitLog, "logged_at" | "created_at">,
) {
  return log.logged_at ?? log.created_at;
}

function toBoundaryDate(value: string, isEnd: boolean) {
  if (value.length > 10) return new Date(value);
  const [year, month, day] = value.split("-").map(Number);
  return isEnd
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

function filterAndSortLogs(logs: HabitLog[], from?: string, to?: string) {
  const fromDate = from ? toBoundaryDate(from, false) : null;
  const toDate = to ? toBoundaryDate(to, true) : null;

  return logs
    .filter((log) => {
      const effectiveDate = new Date(getEffectiveTimestamp(log));
      if (fromDate && effectiveDate < fromDate) return false;
      if (toDate && effectiveDate > toDate) return false;
      return true;
    })
    .sort(
      (left, right) =>
        new Date(getEffectiveTimestamp(right)).getTime() -
        new Date(getEffectiveTimestamp(left)).getTime(),
    );
}

async function getProfileId(profileId?: string) {
  if (profileId) return profileId;
  return getCurrentProfileId();
}

async function triggerMetricsCalculation(
  habitId: string,
  profileId: string,
  logicalDate?: string,
) {
  try {
    const { errorMessage } = await invokeEdgeFunction(
      METRICS_FUNCTION,
      {
        habit_id: habitId,
        profile_id: profileId,
        ...(logicalDate && { logical_date: logicalDate }),
      },
      { throwOnError: false },
    );

    if (errorMessage) {
      console.warn("Metrics calculation issue:", errorMessage);
    }
  } catch (err) {
    console.warn("Failed to trigger metrics calculation:", err);
  }
}

export async function listLogs(
  habitId: string,
  from?: string,
  to?: string,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits_log")
    .select("id, habit_id, profile_id, value, source, logged_at, created_at")
    .eq("profile_id", resolvedProfileId)
    .eq("habit_id", habitId);

  if (error) throw error;
  return filterAndSortLogs(ensureArray<HabitLog>(data ?? [], "Unexpected response from listLogs"), from, to);
}

export async function listLogsForHabits(
  habitIds: string[],
  from?: string,
  to?: string,
  profileId?: string,
) {
  if (habitIds.length === 0) return [] as HabitLog[];
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits_log")
    .select("id, habit_id, profile_id, value, source, logged_at, created_at")
    .eq("profile_id", resolvedProfileId)
    .in("habit_id", habitIds);

  if (error) throw error;
  return filterAndSortLogs(ensureArray<HabitLog>(data ?? [], "Unexpected response from listLogsForHabits"), from, to);
}

export async function createLog(
  habitId: string,
  payload: LogCreateInput,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const insertPayload = {
    profile_id: resolvedProfileId,
    habit_id: habitId,
    value: payload.value,
    logged_at: payload.logged_at ?? null,
    updated_at: new Date().toISOString(),
    ...(payload.source ? { source: payload.source } : {}),
  };

  const { data, error } = await supabase
    .from("habits_log")
    .insert(insertPayload)
    .select("id, habit_id, profile_id, value, source, logged_at, created_at")
    .single();

  if (error) throw error;
  const log = ensureObject<HabitLog>(data, "Unexpected response from createLog");

  // Trigger metrics recalculation (non-blocking)
  triggerMetricsCalculation(
    habitId,
    resolvedProfileId,
    toLocalDateKey(new Date(log.logged_at ?? log.created_at)),
  );

  return log;
}

export async function updateLog(
  habitId: string,
  logId: string,
  payload: LogUpdateInput,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const updates = {
    ...(payload.value !== undefined ? { value: payload.value } : {}),
    ...(payload.source ? { source: payload.source } : {}),
    ...(payload.logged_at !== undefined
      ? { logged_at: payload.logged_at }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("habits_log")
    .update(updates)
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("profile_id", resolvedProfileId)
    .select("id, habit_id, profile_id, value, source, logged_at, created_at")
    .single();

  if (error) throw error;
  const log = ensureObject<HabitLog>(data, "Unexpected response from updateLog");

  // Trigger metrics recalculation (non-blocking)
  triggerMetricsCalculation(
    habitId,
    resolvedProfileId,
    toLocalDateKey(new Date(log.logged_at ?? log.created_at)),
  );

  return log;
}

export async function deleteLog(
  habitId: string,
  logId: string,
  profileId?: string,
) {
  const resolvedProfileId = await getProfileId(profileId);
  const { data, error } = await supabase
    .from("habits_log")
    .delete()
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("profile_id", resolvedProfileId)
    .select("id, habit_id, profile_id, value, source, logged_at, created_at");

  if (error) throw error;

  // Trigger metrics recalculation (non-blocking)
  if (data?.[0]) {
    triggerMetricsCalculation(
      habitId,
      resolvedProfileId,
      toLocalDateKey(new Date(data[0].logged_at ?? data[0].created_at)),
    );
  }

  return data?.[0] ? ensureObject<HabitLog>(data[0], "Unexpected response from deleteLog") : null;
}
